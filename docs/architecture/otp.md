# OTP / phone-verification architecture — DEPRECATED 2026-04-27

> **This spec is no longer in plan.** The product decision on 2026-04-27 dropped phone OTP and third-party KYC vendors entirely. Verification is now manual admin review of uploaded ID + selfie. See `features.md` Section A and `roadmap.md` Phase 1.1 for the current model.
>
> Kept as a reference in case OTP is reintroduced later (e.g. for sensitive-action step-up). The vendor-agnostic `OtpSender` interface and the cost analysis below remain useful patterns. **Do NOT implement `V5__otp.sql` from this doc.**

---

Hybrid WhatsApp + SMS verification, vendor-agnostic, country-aware. *(Original spec below for historical reference.)*

---

## 1. Goals

- **One code path** in the backend regardless of channel or vendor
- **Cheapest viable channel per country** — WhatsApp first for helpers, SMS for employers, fall back automatically
- **No vendor lock-in** — Twilio, AWS End User Messaging, WhatsApp Cloud API, or SG-local SMS gateway can be swapped without touching business logic
- **Local dev** works without sending real messages or paying real money
- **Auditable** — every challenge attempt logged, every send/fail recorded with cost
- **Abuse-resistant** — rate limited, replay-proof, expiry-bound

---

## 2. High-level flow

```
   ┌──────────┐    POST /auth/otp/start     ┌──────────────────────┐
   │  client  │ ─────────────────────────►  │  OtpController       │
   │ (web/app)│                             └──────────┬───────────┘
   └──────────┘                                        │
                                                       ▼
                                          ┌────────────────────────┐
                                          │ OtpService             │
                                          │  · rate-limit check    │
                                          │  · pick channel        │
                                          │  · generate code       │
                                          │  · persist challenge   │
                                          └──────────┬─────────────┘
                                                     │
                            ┌────────────────────────┼────────────────────────┐
                            ▼                        ▼                        ▼
                    ┌────────────────┐      ┌────────────────┐       ┌────────────────┐
                    │ ChannelRouter  │      │ otp_challenges │       │ Redis          │
                    │ (per-country   │      │ (Postgres)     │       │ (rate limits,  │
                    │  preference)   │      │                │       │  attempt count)│
                    └────────┬───────┘      └────────────────┘       └────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │ WhatsAppOtp  │  │ SmsOtpSender │  │ EmailOtp     │
   │ Sender       │  │              │  │ Sender       │
   │ (Cloud API)  │  │ (AWS / Twilio│  │ (SES /       │
   │              │  │  / SG-local) │  │  Mailhog)    │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                 │
          ▼                 ▼                 ▼
   ┌─────────────────────────────────────────────────┐
   │  vendor delivery, status webhook back to app    │
   └─────────────────────────────────────────────────┘

                   USER receives code, returns it:

   ┌──────────┐  POST /auth/otp/verify  ┌──────────────────┐
   │  client  │ ─────────────────────►  │ OtpService.verify│
   └──────────┘                         │  · constant-time │
                                        │    compare       │
                                        │  · burn challenge│
                                        │  · issue JWT     │
                                        └──────────────────┘
```

---

## 3. Channel routing

For every OTP request, the router picks the **preferred** channel and a **fallback chain** based on the destination country and the user's known channel availability.

```
   country ─► preferred ─────────────► fallback chain
   ----------------------------------------------------
   SG       → SMS   (AWS, registered alpha sender)  → WhatsApp → email
   PH       → WhatsApp Cloud API                    → SMS      → email
   ID       → WhatsApp Cloud API                    → SMS      → email
   MM       → WhatsApp Cloud API                    → SMS      → email
   *        → SMS (Twilio default)                  → email
```

Routing rationale:
- **SG** — alphanumeric "HelperHaven" sender ID (registered with SSIR) is the most-trusted UX for SG employers. WhatsApp fallback in case of telco delivery issues.
- **PH/ID/MM** — WhatsApp adoption is near-universal, ~10× cheaper than SMS, better rural deliverability. SMS as fallback for users without WhatsApp.
- **Email** is a last-resort fallback for everyone — slower, weaker assurance, never the primary channel for first-time signup.

The router consults `users.channel_preferences` (`{whatsapp, sms, email}` boolean per channel) and the user's verified contact methods. A helper who has no WhatsApp on file falls straight to SMS.

---

## 4. Component breakdown

### 4.1 `OtpController` (HTTP layer)

```
POST /auth/otp/start
  body: { phone: "+639171234567", purpose: "SIGNUP" | "LOGIN" | "STEP_UP" | "PHONE_CHANGE" }
  201:  { challengeId: "uuid", channel: "WHATSAPP", expiresAt: "2026-04-27T10:05:00Z" }
  429:  rate limited

POST /auth/otp/verify
  body: { challengeId: "uuid", code: "482910" }
  200:  { token: "jwt..." } | { stepUpToken: "..." } depending on purpose
  401:  invalid / expired / burned
  429:  too many attempts
```

### 4.2 `OtpService` (business logic)

Responsibilities:
- Normalise phone number to E.164 (libphonenumber)
- Reject disposable / VOIP numbers when used for SIGNUP
- Rate-limit by `(phone, ip, account)` triple via Redis sliding window
- Generate 6-digit numeric code (cryptographically random)
- Persist `otp_challenge` row with hashed code (bcrypt or HMAC-SHA256 with pepper)
- Hand off to `ChannelRouter.send(...)` and record the chosen channel
- On verify: constant-time compare, mark burned, return appropriate token

Limits:
- **3 challenges per phone per 15 min**
- **10 verify attempts per challenge** before lockout
- **5 min code expiry**
- **30 min lockout** on (phone) after limit hit

### 4.3 `ChannelRouter`

Pure function: `(phone, user, purpose) → ChannelPlan`. Returns ordered list of `(OtpSender, contactValue)` to try. Does not send; the service iterates.

### 4.4 `OtpSender` interface (vendor-agnostic)

```java
public interface OtpSender {
    Channel channel();                          // WHATSAPP | SMS | EMAIL
    SendResult send(SendRequest request);       // synchronous, with timeout
}

public record SendRequest(
    String challengeId,
    String destination,    // E.164 phone, or email address
    String code,           // the OTP itself
    String purpose,        // SIGNUP / LOGIN / STEP_UP / PHONE_CHANGE
    Locale locale          // for template selection
) {}

public record SendResult(
    Status status,         // ACCEPTED | REJECTED_INVALID | REJECTED_BLOCKED | TRANSIENT_ERROR
    String vendorRef,      // vendor's message ID, for webhook reconciliation
    BigDecimal costSgd,    // best-effort cost estimate at send time
    String vendorRaw       // raw vendor response for debugging
) {}
```

Implementations live behind Spring's `@Qualifier`:

| Bean | Channel | Vendor |
|---|---|---|
| `awsSmsSender` | SMS | AWS End User Messaging (prod) |
| `twilioSmsSender` | SMS | Twilio (alt / non-SG) |
| `localSgSmsSender` | SMS | SG-local gateway (cheaper SG-only) |
| `whatsappCloudSender` | WHATSAPP | Meta WhatsApp Cloud API |
| `sesEmailSender` | EMAIL | AWS SES |
| `mailhogSender` | EMAIL | Mailhog (local dev) |
| `consoleSender` | * | Logs to stdout (local dev / tests) |

Choice of bean per channel is configured via `application.yml`:

```yaml
helperhaven:
  otp:
    code-length: 6
    expiry-seconds: 300
    max-attempts: 10
    senders:
      sms:    aws        # local | dev: console
      whatsapp: cloud    # local | dev: console
      email:  ses        # local | dev: mailhog
    routing:
      SG: [sms, whatsapp, email]
      PH: [whatsapp, sms, email]
      ID: [whatsapp, sms, email]
      MM: [whatsapp, sms, email]
      default: [sms, email]
```

### 4.5 Webhook handler

Vendors deliver async status updates (DELIVERED / FAILED / READ for WhatsApp).

```
POST /webhooks/otp/{vendor}
   verify HMAC signature → DeliveryStatusEvent → updates otp_challenges.delivery_status
                                                  records actual_cost_sgd
                                                  fires metrics
```

If the primary channel returns FAILED before the user verifies, the service can proactively re-send via the next channel in the fallback chain (gated on a per-challenge `escalation_count <= 1`).

---

## 5. Database schema

New migration **V5__otp.sql** (additive, never edit past migrations):

```sql
CREATE TYPE otp_channel AS ENUM ('SMS', 'WHATSAPP', 'EMAIL');
CREATE TYPE otp_purpose AS ENUM ('SIGNUP', 'LOGIN', 'STEP_UP', 'PHONE_CHANGE');
CREATE TYPE otp_status  AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'BURNED', 'FAILED');

CREATE TABLE otp_challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE, -- null for pre-signup
    destination     VARCHAR(64) NOT NULL,        -- E.164 phone or email
    destination_type VARCHAR(8) NOT NULL,        -- 'phone' | 'email'
    purpose         otp_purpose NOT NULL,
    code_hash       VARCHAR(255) NOT NULL,       -- HMAC-SHA256 with pepper
    channel         otp_channel NOT NULL,        -- channel actually used
    vendor          VARCHAR(32) NOT NULL,        -- 'aws_sms' | 'twilio' | 'whatsapp_cloud' ...
    vendor_ref      VARCHAR(128),                -- vendor message id
    status          otp_status NOT NULL DEFAULT 'PENDING',
    attempts        SMALLINT NOT NULL DEFAULT 0,
    estimated_cost_sgd  NUMERIC(8,4),
    actual_cost_sgd     NUMERIC(8,4),            -- filled by webhook
    delivery_status     VARCHAR(32),             -- DELIVERED / FAILED / READ
    escalation_count    SMALLINT NOT NULL DEFAULT 0,
    request_ip      INET,
    request_ua      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    verified_at     TIMESTAMPTZ
);

CREATE INDEX idx_otp_destination_pending ON otp_challenges(destination, created_at DESC)
    WHERE status = 'PENDING';
CREATE INDEX idx_otp_user ON otp_challenges(user_id, created_at DESC);
CREATE INDEX idx_otp_vendor_ref ON otp_challenges(vendor, vendor_ref);
```

Audit-friendly: never updated except status / attempts / cost / escalation. Soft-deleted on user erase via `ON DELETE CASCADE`.

Plus extending `users`:

```sql
ALTER TABLE users
  ADD COLUMN phone_e164          VARCHAR(20),
  ADD COLUMN phone_country       CHAR(2),       -- ISO-3166-1 alpha-2
  ADD COLUMN phone_verified_at   TIMESTAMPTZ,
  ADD COLUMN email_verified_at   TIMESTAMPTZ,
  ADD COLUMN whatsapp_opted_in   BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL;
```

---

## 6. Vendor configuration (env vars)

Drop into `.env.example` and into AWS Secrets Manager in prod:

```
# AWS End User Messaging (SMS — primary for SG)
AWS_SMS_REGION=ap-southeast-1
AWS_SMS_SENDER_ID=HelperHaven        # registered with SGNIC SSIR
AWS_SMS_MAX_PRICE_USD=0.10           # hard ceiling per message

# WhatsApp Cloud API (Meta)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_ACCESS_TOKEN=...            # rotate every 60 days
WHATSAPP_TEMPLATE_OTP_NAME=hh_auth_code_v1
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...

# Twilio (fallback / non-SG SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+1...

# SG-local SMS (optional, cheaper for SG-only)
SG_SMS_API_KEY=...
SG_SMS_ENDPOINT=https://...

# OTP behaviour
OTP_CODE_PEPPER=...                  # rotate yearly, keep grace period
OTP_RATE_LIMIT_PER_PHONE=3
OTP_RATE_LIMIT_WINDOW_SEC=900
```

---

## 7. Local dev

`SPRING_PROFILES_ACTIVE=local` flips all senders to no-network implementations:

```yaml
helperhaven:
  otp:
    senders:
      sms:    console        # logs "[OTP] +6591234567 → 482910" to stdout
      whatsapp: console
      email:  mailhog        # captured at http://localhost:8025
```

The `consoleSender` writes the OTP to logs **only** when `SPRING_PROFILES_ACTIVE=local`. In any other profile the sender bean is not registered — defence in depth against accidentally exposing real OTPs.

For integration tests: use `consoleSender` + a `TestOtpInbox` that captures emitted codes in-memory and exposes them to assertions.

---

## 8. Failure modes & retries

| Scenario | Behaviour |
|---|---|
| Vendor returns `TRANSIENT_ERROR` | Retry once with same channel after 3s; then escalate to next channel |
| Vendor returns `REJECTED_INVALID` (bad number) | Mark challenge `FAILED`, surface to user, do not retry |
| Vendor returns `REJECTED_BLOCKED` (spam list) | Same as invalid + flag account for review |
| Webhook reports `DELIVERED=false` after 60s | Auto-escalate to next channel if `escalation_count<=1` and no verify yet |
| User submits wrong code | Increment `attempts`; lock challenge at 10 |
| User submits expired code | Reject with `EXPIRED`; require new `start` call |
| User submits valid code | Atomic `UPDATE ... WHERE status='PENDING' RETURNING` to prevent replay |
| Same phone, multiple pending | Newest wins; older auto-marked `BURNED` |

---

## 9. Observability

CloudWatch metrics (or Prom locally):

- `otp.sent.count{channel, country, vendor}`
- `otp.verified.count{channel, country, purpose}`
- `otp.failed.count{channel, country, reason}`
- `otp.cost.sgd{channel, country, vendor}` — gauge, summed daily
- `otp.delivery_latency_ms{channel, vendor}` — histogram
- `otp.escalation.count{from_channel, to_channel}`

Alerts:
- 5xx rate from any vendor > 5% over 5 min → page
- Daily cost > S$20/day → page (catches runaway loops)
- Delivery rate to any country < 90% over 1 hour → ticket
- Same destination > 10 starts/hour → auto-block + ticket

---

## 10. Anti-abuse

- Disposable / VOIP number detection on SIGNUP via libphonenumber + a small blocklist
- Per-IP rate limit (10 starts/hour) layered on top of per-phone limit
- Recaptcha v3 on `start` if score < 0.5
- Identity-hash dedupe (when KYC is reached) catches multi-account farms
- Challenge code is always 6 digits, never longer (brute-force resistance comes from `max-attempts=10`, not code length)

---

## 11. Cost projection (re-stated)

| User base stage | Monthly OTPs | Channel mix | Estimated cost (SGD) |
|---|---|---|---|
| Now (50 concurrent) | ~800 | hybrid | ~S$45–50 |
| 1k MAU | ~1,500 | hybrid | ~S$75 |
| 5k MAU | ~6,000 | hybrid | ~S$280 |
| 10k MAU | ~12,000 | hybrid | ~S$540 |

Plus fixed: SG Sender ID registration ~S$200/year, WhatsApp BSP fees ~$0 (using Meta direct), AWS quota-increase ticket ~$0.

---

## 12. Where this lives in the roadmap

- **Phase 1.1 (auth)** — implement `OtpService` + `OtpController` + V5 migration + `consoleSender` + `mailhogSender`
- **Phase 2 (staging)** — wire `awsSmsSender` + `whatsappCloudSender` against sandbox accounts; register SG Sender ID
- **Phase 3 (prod)** — flip channel preferences from `console` to real vendors; raise AWS SMS spend cap

---

## 13. Open decisions

- [ ] WhatsApp BSP route: direct via Meta Cloud API vs go through Twilio's WhatsApp wrapper (Twilio is simpler, ~10–20% pricier)
- [ ] SG-local SMS gateway: skip and use AWS only, or sign up with a local provider for SG-only traffic to save ~S$0.02/SMS
- [ ] Whether to support voice-call OTP fallback for accessibility (low priority)
- [ ] How to handle helpers without WhatsApp at all — allow email-only signup, or block until they install it
