# HelperHaven — roadmap & architecture

Living document. Mark items `[x]` as they land. Last touched: 2026-04-27.

---

## 0. Build sprints (start here for the local version)

Added 2026-04-27. The Phase 1 feature spec below (sections 1.1–1.13) is a flat catalogue, not a build order. **This section is the build order.** Each sprint produces a runnable local docker-compose-up version with one more layer of capability. Do not move to the next sprint until the previous one is demoable end-to-end.

Cross-references like *(see §1.5)* point to the detailed feature spec further down this doc.

### Sprint A — Thin end-to-end loop (1–2 weeks)
**Goal:** a tester can `docker compose up`, sign up as both an employer and a helper, see a match, chat, "unlock" with mock credits, and leave a review. No real money, no ID upload, no admin work yet. Proves the core loop works.

- [ ] Email + password auth, JWT, password reset (see §1.1, minus step-up + login post-hook)
- [ ] Helper profile basics: name, country, age, languages, photo upload to MinIO, 100-point skill 5-vector (§1.2 minus state machine, minus inactivity counter)
- [ ] Employer profile basics: household, 5-vector preferences, hiring purpose free-text (§1.3 minus structured tags)
- [ ] Match scoring: dot product + simple list endpoint, no filters yet (§1.5 minus filters + transfer badge)
- [ ] Chat MVP: REST `messages` CRUD, polling on the client (skip WebSocket until Sprint B), no PII redaction yet (§1.7 minus those)
- [ ] Mock credit balance: `credit_balances` table seeded with 99 credits per employer at signup, unlock decrements; no PayNow yet (§1.6 minus payment)
- [ ] Reviews: write + read, gated on a stub `permit_cases.status >= CARD_ISSUED` (manually flip a permit case to CARD_ISSUED in the DB to demo) (§1.8)
- [ ] One Direction-A-styled landing → signup → onboarding → matches → chat → review walk-through (no admin UI yet)

**Demo at end of A:** "two browser windows, helper here, employer there, they meet, chat, employer leaves a review."

### Sprint B — Trust & engagement (1–2 weeks)
**Goal:** the loop becomes safe and self-sustaining. Profile state machine, PII redaction, the 48h auto-refund + anti-ghosting layer, helper questionnaire.

- [ ] Helper profile state machine: `DRAFT` → `COMPLETE_NO_PASSPORT` → `PENDING_VERIFICATION` → `LIVE` / `HIDDEN` / `INACTIVE` / `REJECTED`; only `LIVE` surfaces in search (§1.2)
- [ ] Document upload UI per role: NRIC/FIN front+back+selfie for employers, passport bio + selfie for helpers, S3 prefix `regulated/` (§1.4 — UI side, no admin queue yet)
- [ ] PII redaction filter in chat (server-side, regex for phone/email/NRIC/addresses) (§1.7)
- [ ] WebSocket transport for chat (Spring WebFlux), replaces polling from Sprint A
- [ ] 48h auto-refund cron `UNLOCK_REFUND_AUTO` (§1.6)
- [ ] Anti-ghosting: `consecutive_unlocks_without_reply` counter; `helperInactivityThreshold` config (default 3); `LIVE → INACTIVE` flip; warning email at X-1; counter reset on first-reply (§1.2 + §1.6)
- [ ] Login post-hook: `INACTIVE → LIVE` re-activation on helper login (§1.1)
- [ ] Helper questionnaire: schema (`questionnaires` + `questions` + `question_translations`), answer capture, en/id/my locales, auto-language pick from `country_of_origin` (§1.12)
- [ ] Required-question gate before profile can move to `PENDING_VERIFICATION` (§1.12)

**Demo at end of B:** "ghost a helper three times in a row, watch her go INACTIVE; log her back in, watch her come back; chat tries to leak a phone number, server scrubs it."

### Sprint C — Money flows + admin panel (2 weeks)
**Goal:** real money moves. PayNow QR, admin verification queues, services catalogue.

- [ ] Admin panel skeleton + admin login + role gate (§L)
- [ ] Identity-verification admin queue: review uploaded ID + selfie, APPROVE / REJECT / REQUEST_MORE_INFO (§1.4)
- [ ] PayNow QR generation: `paynow-qr` library, dynamic QR with reference `HH-{6-digit}-{userId-suffix}`, `payment_orders` state machine (§1.6)
- [ ] Admin payment-verification queue: match PayNow inbox to orders by reference + amount, atomic "Mark paid" (§1.6)
- [ ] Replace mock credit balance from Sprint A with real PayNow-backed allocation
- [ ] `service_catalogue_items` table + admin authoring UI (CRUD + price audit) (§1.13)
- [ ] "Confirm this helper" CTA → catalogue picker → bundled PayNow QR → `service_orders` + `service_order_items` (§1.13)
- [ ] Admin order-detail view with employer mobile prominently shown; admin marks lines `IN_PROGRESS` / `DELIVERED` with notes (§1.13)
- [ ] `audit_events` table — write rows for every admin transition across identity / payment / catalogue (cross-cutting)

**Demo at end of C:** "buy a credit pack via PayNow QR, admin marks paid, balance updates; confirm a helper, pick WP_APPLICATION + RUNNER_AIRPORT, pay, admin sees the order with employer's phone number."

### Sprint D — Concierge surfaces (2 weeks)
**Goal:** the long-tail high-touch workflows that turn HelperHaven into a real concierge product, not just a marketplace.

- [ ] IPA case management UI: admin edits state, uploads MOM-issued docs, records MOM reference numbers, transitions with reason (§1.10)
- [ ] Employer-facing read-only case timeline (§1.10)
- [ ] Stuck-case alerts in admin queue (§1.10)
- [ ] Household to-do list: `household_tasks` + `household_task_events`, recurring rules, helper marks done with photo + note (§1.9)
- [ ] Calendar surface: `leave_requests`, `leave_balances`, `rest_day_rules`, `sg_public_holidays` (§1.9)
- [ ] Termination + transfer-pool flip: `termination_cases`, auto-flip `available_for_transfer = true` on transfer resolution, "★ In SG · transfer ready · 7 days" badge in matches (§1.11)
- [ ] Chat check-in cron: prompt employer at chat-age ≥ 7d, `chat_checkins` table, `DECIDED_HELPER_X` deep-links into catalogue flow, `FOUND_OUTSIDE_HH` flagged for counsellor (§1.7)
- [ ] Notifications: in-app centre + email via Mailhog/SES; per-event preferences (§M)

**Demo at end of D:** "full lifecycle from match → chat → confirm → catalogue → IPA submitted → IPA approved → arrived → CARD_ISSUED → reviews unlocked."

### Sprint E — Hardening before staging (1–2 weeks)
**Goal:** the local version is ready to be lifted onto Lightsail without ugly surprises.

- [ ] Step-up password re-entry for sensitive actions (refund, payout-method change, account close) (§1.1)
- [ ] Rate limiting (Redis sliding window) on login + unlock + signup
- [ ] PDPA data-deletion endpoint with cascade
- [ ] Daily reconciliation report: PayNow inbox vs `payment_orders`, surface unmatched items (§F + §L)
- [ ] `R__seed_dev.sql` synthetic seed: 10 helpers across PH/ID/MM, 5 employers, mixed verification states; no real PII
- [ ] Makefile targets: `up`, `down`, `logs`, `migrate`, `seed`, `reset`, `test`, `format`
- [ ] `.env.example` audited so a fresh clone runs first time
- [ ] README "first run in 5 minutes" verified by clean clone
- [ ] OpenAPI / Swagger doc generation

**Demo at end of E:** "clone the repo on a fresh laptop, `make up`, full happy path runs in 5 minutes."

After Sprint E, move to **Phase 2 (Lightsail staging)** — Cloudflare DNS, Caddy TLS, real S3 bucket, GitHub Actions deploy. Detailed in §3 below.

### Build-sprint cheat sheet

| Sprint | Theme | Demo gate |
|---|---|---|
| A | Thin loop | Two browsers, signup → match → chat → mock unlock → review |
| B | Trust + engagement | Anti-ghosting works; PII redacted live; questionnaire in 3 languages |
| C | Money + admin | Real PayNow allocation; catalogue ordering with off-platform delivery handoff |
| D | Concierge | Full IPA → CARD_ISSUED lifecycle; household to-do; transfer pool |
| E | Hardening | Clean clone runs in 5 minutes; reconciliation green |
| Phase 2 | Lightsail staging | Synthetic load test of 50 concurrent users |
| Phase 3 | Production cutover | Path A or Path B per §3 |

Each sprint should land its own Flyway migration(s) — V5 likely Sprint B (state machine + counter + questionnaire), V6 Sprint C (payment_orders + catalogue + service_orders + audit_events), V7 Sprint D (chat_checkins + household_tasks). Don't batch across sprints — each migration is a checkpoint.

---

## 1. Architecture

### 1.1 Local development

Single `docker-compose up` brings up everything needed to run the product end-to-end on a laptop. No cloud account required.

```
                ┌──────────────────────── localhost ────────────────────────┐
                │                                                            │
   browser ───► │  :5173  frontend-web  (React + Vite, Nginx in container)   │
                │  :5174  admin         (React, separate bundle)             │
                │  :8080  backend       (Spring Boot 3.3.4, Java 21)         │
                │                                                            │
                │           │                  │              │              │
                │           ▼                  ▼              ▼              │
                │   :5432 postgres:16    :6379 redis:7   :9000 minio (S3)    │
                │                                         :9001 minio UI     │
                │                                                            │
                │   :1025 mailhog SMTP   :8025 mailhog UI                    │
                └────────────────────────────────────────────────────────────┘

   Stripe        ─────► dropped 2026-04-27 (PayNow + admin allocation)
   Sumsub/Onfido ─────► dropped 2026-04-27 (admin manual ID review)
   MOM eService  ─────► not integrated; admin updates IPA cases via admin UI (deferred 2026-04-27)
```

Why each piece:
- **Postgres 16** — same major version as RDS in prod. Flyway V1→V4 is the only schema source of truth.
- **Redis** — chat presence, rate limits, ephemeral session state.
- **MinIO** — S3-compatible. Backend uses the AWS SDK with a custom endpoint URL; same code runs against real S3 in prod.
- **Mailhog** — captures outbound email so dev never sends real mail.
- **No LiveKit, no coturn** — chat-first pivot; never reintroduce.

### 1.2 Production (AWS, ap-southeast-1)

Two flavours. Pick based on stage.

**Flavour A — Lightsail (private beta, ~S$55/mo).** Single-instance, simplest possible.

```
   Cloudflare DNS  ───►  Lightsail static IP  ───►  Lightsail instance (4GB / 2 vCPU)
       (TLS edge)                                       │
                                                        ├─ Caddy (TLS + reverse proxy)
                                                        ├─ docker compose up
                                                        │     ├─ backend
                                                        │     ├─ frontend-web (Nginx)
                                                        │     └─ admin
                                                        │
                                                        └─ Lightsail Postgres (managed)

   S3 ap-southeast-1  ◄── KYC docs, helper photos, permit PDFs (SSE-KMS)
   Cloudflare R2      ◄── nightly pg_dump backups, 30-day retention
```

**Flavour B — Sensible-tier AWS (post-launch, ~S$130/mo).** Same docker images, real production posture.

```
   Cloudflare DNS  ──►  ALB (TLS, WS upgrade, sticky)
                          │
                          ├─► EC2 t4g.medium (backend container)
                          └─► CloudFront ──► S3 (React static bundle)
                                  │
                                  └─► S3 (KYC docs, photos, PDFs · SSE-KMS)

   RDS db.t4g.small Single-AZ (Postgres 16, automated backups 7d)
   ElastiCache Redis t4g.micro
   Secrets Manager: DB password, Stripe live, KYC live, JWT signing key
   CloudWatch Logs + alarms
   Route 53 (or stay on Cloudflare DNS)
```

Migration A → B is `docker compose pull` against a different host plus pointing DNS — no app code changes.

### 1.3 Data trust boundaries

| Surface | Source | Verified? | Storage |
|---|---|---|---|
| Skill 5-vector | Helper self-rates | No (employer can verify post-contract) | `helper_skill_scores` |
| Past experience | Helper writes | **No — explicitly self-reported** | `helper_experiences` |
| Reviews | Employer / helper | **Yes — gated on `permit_cases.status >= CARD_ISSUED`** | `reviews` |
| ID + selfie docs | Helper / employer upload | **Yes — admin-reviewed manually** (Sumsub/Onfido dropped 2026-04-27) | S3 prefix `regulated/` |
| Identity | Email + admin-reviewed ID + selfie (Singpass deferred, OTP dropped 2026-04-27) | Partial | `users` + `id_verification_uploads` |
| IPA / permit case state | Admin updates from MOM eService responses | **Yes — admin-recorded with audit log** | `permit_cases` + `audit_events` |

Reviews are the only fully-verified trust signal. Don't conflate with experience or skills.

---

## 2. Tech stack pinned

- **Backend:** Java 21, Spring Boot 3.3.4, Flyway, Spring Data JPA, Spring Security, Spring WebFlux for chat WS
- **Database:** PostgreSQL 16 (UTC), enums via Postgres `CREATE TYPE`
- **Cache/queue:** Redis 7
- **Frontend:** React 18, Vite, TypeScript, Tailwind, Fraunces + Inter + Caveat
- **Admin:** Same stack, separate bundle
- **Object storage:** MinIO (dev) / S3 (prod), AWS SDK v2
- **Payments:** PayNow QR + admin manual allocation (no Stripe at MVP per 2026-04-27)
- **Identity verification:** Admin manual review of uploaded ID + selfie (no third-party KYC vendor per 2026-04-27)
- **MOM Work Permit filing:** Admin staff file MOM eService externally and update IPA cases via admin UI (no automated integration at MVP per 2026-04-27)
- **Email:** Mailhog (dev) / SES (prod)
- **TLS:** Caddy (Lightsail) or ALB (sensible tier)
- **DNS:** Cloudflare
- **CI/CD:** GitHub Actions → GHCR → SSH-pull (Lightsail) or ECS deploy (sensible tier)
- **Region:** ap-southeast-1 (Singapore)

---

## 3. Phased TODO

### Phase 0 — Local foundation

- [x] `infra/docker-compose.yml` with postgres, redis, backend, frontend-web, admin
- [x] MinIO + minio-init bucket bootstrap in compose
- [x] Mailhog in compose
- [x] Flyway migrations V1 (baseline), V2 (seed), V3 (chat pivot), V4 (helper experiences)
- [x] Backend skeleton: `config`, `domain.User`, `domain.enums`, `repo.UserRepository`, `storage.FileStorage` + `S3FileStorage`, `web.HealthController`
- [x] Frontend skeleton: `HomePage`, `HealthPage`
- [x] Admin skeleton
- [x] LiveKit / coturn fully purged
- [x] AppProperties refactored (chatRefundHours=48, chatThreadExpiryDays=30)
- [x] `dev.sh` bring-up script
- [ ] `Makefile` with targets: `up`, `down`, `logs`, `migrate`, `seed`, `reset`, `test`, `format`
- [ ] `R__seed_dev.sql` synthetic dev seed (10 helpers, 5 employers, no real PII; agencies removed 2026-04-27)
- [ ] `.env.example` audited so a fresh clone runs first time
- [ ] README "first run in 5 minutes" section verified by a clean clone

### Phase 1 — Backend domain + APIs

#### 1.1 Identity & auth
- [ ] `users` CRUD + email/password sign-up (helper, employer, admin — agency role dropped 2026-04-27)
- [ ] Email verification link
- [ ] JWT issuance + refresh
- [ ] Spring Security config wired to JWT
- [ ] Password reset flow via Mailhog/SES
- [ ] Step-up password re-entry for sensitive actions
- [ ] Rate limit on login via Redis (no OTP rate limit needed — OTP dropped 2026-04-27)
- [ ] **Login post-hook for helpers**: if `helper_profile.state == INACTIVE`, flip to `LIVE`, reset `consecutive_unlocks_without_reply = 0`, write audit row, surface "welcome back, your profile is visible again" toast on the dashboard (anti-ghosting re-activation, added 2026-04-27 evening)

#### 1.2 Helper profile
- [ ] `helper_profiles` CRUD
- [ ] **Profile state column** with state machine: `DRAFT` → `COMPLETE_NO_PASSPORT` → `PENDING_VERIFICATION` → `LIVE` / `REJECTED` / `HIDDEN` / `INACTIVE`
- [ ] State transition rules enforced in service layer (only `LIVE` profiles surface in search)
- [ ] `consecutive_unlocks_without_reply INT NOT NULL DEFAULT 0` column on `helper_profiles`
- [ ] Anti-ghosting flip: at counter ≥ `helperInactivityThreshold` (default 3), state goes `LIVE → INACTIVE`; `INACTIVE` profiles are not searchable and not unlockable
- [ ] Counter reset on any first-reply (incl. late replies after the 48h window) and on helper login
- [ ] "Almost there — upload your passport" dashboard prompt while in `COMPLETE_NO_PASSPORT`
- [ ] 100-point budget skill scores (5 metrics, sum=100 enforced)
- [ ] Sub-tags (Cooking-Halal, Pet care, etc.) yes/no
- [ ] Helper photo upload to S3/MinIO via presigned URL
- [ ] `helper_experiences` CRUD (V4) — self-reported, "Self-reported" badge in API response
- [ ] Languages, age, country of origin, height/weight, marital status

#### 1.3 Employer profile
- [ ] `employer_profiles` CRUD
- [ ] Household description, weights for 5 metrics
- [ ] **Hiring-purpose declaration** (free text + structured tags: elderly care, infant care, both-parents-working, special needs, etc.) — added 2026-04-27
- [ ] Preferred nationality / age band / language (soft filters)
- [ ] Required sub-tags (live-in / drives / etc.)
- [ ] Employer photo (optional)

#### 1.4 Manual identity verification (replaces KYC vendor)
*Reframed 2026-04-27 — no third-party KYC vendor. Document type and timing differ by role.*

Document types per role:
- **Employer (Singaporean / PR):** NRIC (IC) front + back + selfie holding IC
- **Employer (foreigner in SG):** FIN card front + back + selfie
- **Helper (overseas, PH/ID/MM):** Passport bio page + selfie holding passport
- **Helper (in-SG transfer pool):** Work Permit Card + Passport bio page + selfie

Timing rules:
- **Employers verify at signup**, before any payment or IPA filing. Cost-asymmetry rationale: employers spend real money downstream, fake employer accounts pose higher fraud risk.
- **Helpers verify before going live in search**, NOT at signup. They can sign up and build profile / questionnaire / experiences with state `DRAFT` → `COMPLETE_NO_PASSPORT`. Passport upload moves them to `PENDING_VERIFICATION`. Admin approval moves them to `LIVE`. Avoids burning admin labour on helpers who never finish onboarding.

Build items:
- [ ] Document upload UI per role (front + back for IC/FIN, single page for passport)
- [ ] Selfie capture flow with on-screen guidance ("hold the document next to your face")
- [ ] Storage in S3 prefix `regulated/{role}/{user_id}/{type}_{timestamp}.jpg`, SSE-KMS, signed-URL access
- [ ] User verification status enum: `PENDING` → `VERIFIED` / `REJECTED`
- [ ] Helper profile state machine (`DRAFT` / `COMPLETE_NO_PASSPORT` / `PENDING_VERIFICATION` / `LIVE` / `HIDDEN` / `REJECTED`)
- [ ] Automated NRIC/FIN checksum pre-check (S/T/F/G prefix algorithm)
- [ ] Optional passport MRZ parse to pre-fill admin form (name, DOB, expiry, country)
- [ ] Admin review queue: APPROVE / REJECT / REQUEST_MORE_INFO with reason text
- [ ] Email notifications on status change ("Your account is verified" / "We need a clearer photo")
- [ ] Block listing + payment until `VERIFIED` (employer); block search-visibility until `LIVE` (helper)
- [ ] Re-verification trigger on suspicious activity (admin-driven, not cron)

#### 1.5 Matching
- [ ] Match score = dot product of helper 5-vector × employer weight 5-vector
- [ ] Filter: country, age, sub-tags, salary band, available_for_transfer
- [ ] Pagination + ranking endpoint
- [ ] "★ In SG · transfer ready · can start in 7 days" badge surfaced on every list/filter

#### 1.6 Credits & PayNow payments
*Reframed 2026-04-27 — no Stripe. Verification rule: admin must confirm funds landed in the HelperHaven UEN before allocating credits. Same rule applies to services orders in §1.13. Never auto-allocate.*
- [ ] `credit_packages` revised to two tiers (S$15/5, S$40/15 — agency S$100/50 dropped)
- [ ] `payment_orders` table with state: `PENDING_PAYMENT` → `PAID` / `EXPIRED` / `REFUNDED`
- [ ] Dynamic PayNow QR generation with embedded reference (HH-{6-digit}-{userId-suffix})
- [ ] Optional receipt-screenshot upload by user on the order
- [ ] Admin payment-verification queue: match PayNow inbox to orders by reference + amount; queue handles BOTH credit-pack and service orders
- [ ] Admin "Mark paid → allocate credits" action (atomic: order PAID, balance += pack, ledger row, audit row)
- [ ] Reserve credit on unlock → burn on helper first reply
- [ ] 48h auto-refund sweep job (`UNLOCK_REFUND_AUTO`) — also increments helper's `consecutive_unlocks_without_reply` counter; sends warning email to helper at counter == X-1; flips helper to `INACTIVE` at counter == X
- [ ] `AppProperties.helperInactivityThreshold` config key (default 3) so X is tunable without code change
- [ ] Manual refund admin action (`UNLOCK_REFUND_MANUAL`) — does NOT increment the inactivity counter (different cause)
- [ ] Credit ledger query for finance
- [ ] Daily reconciliation report for admin (unmatched payments / orders)

#### 1.7 Chat
- [ ] `conversations`, `messages` CRUD
- [ ] WebSocket endpoint (Spring WebFlux + STOMP or native WS)
- [ ] PII redaction filter (phone, email, NRIC, addresses) — server-side enforced
- [ ] Image attachment via presigned URL
- [ ] `message_reports` for abuse flagging
- [ ] 30-day thread expiry
- [ ] **Periodic check-in** (added 2026-04-27): cron polls active conversations and prompts the employer "did you find someone?" once chat age >= 7 days, then every 7 days thereafter
- [ ] `chat_checkins` table (append-only): `employer_id`, `conversation_id`, `helper_id`, `prompted_at`, `answered_at`, `answer` (`STILL_LOOKING` / `DECIDED_HELPER_X` / `FOUND_OUTSIDE_HH` / `NOT_HIRING_ANYMORE`), `notes`
- [ ] In-app prompt + email reminder (one of each, no nagging — gentle pattern same as household to-do)
- [ ] `DECIDED_HELPER_X` answer deep-links into the §1.13 confirm-helper / catalogue flow
- [ ] `FOUND_OUTSIDE_HH` answer flags the conversation for an admin counsellor follow-up (not coercive — "glad you found someone, was it through us originally?")
- [ ] Conversion / matching effectiveness dashboard (% of unlocks → confirmed helpers within 30 days)

#### 1.8 Reviews
- [ ] `reviews` write API, gated on `permit_cases.status >= CARD_ISSUED` (CHECK + service layer)
- [ ] Two-way: employer reviews helper, helper reviews employer
- [ ] Stars + free text + flag-tag chips + English-level enum
- [ ] Verified 5-metric breakdown alongside helper self-rating
- [ ] Reviews follow helper across employers (transfer pool)

#### 1.9 Household management (calendar + to-do)
*Renamed and expanded 2026-04-27 to include household to-do list.*

Calendar:
- [ ] `leave_requests` (helper requests → employer approves/declines)
- [ ] `leave_balances` per helper-employment
- [ ] `rest_day_rules` (MOM weekly rest day)
- [ ] `sg_public_holidays` auto-populated each year
- [ ] Calendar feed endpoint (iCal export)

To-do list (new):
- [ ] `household_tasks` table (one-off + recurring rules)
- [ ] `household_task_events` per occurrence (PENDING / DONE / SKIPPED)
- [ ] Employer creates / edits tasks; helper marks done with optional photo + note
- [ ] Recurring rules (daily, weekly on specific days)
- [ ] Optional translation of task description (English ↔ id / my)
- [ ] Daily summary view; weekly completion rate visible on profile
- [ ] Quiet notifications (one reminder, not five — helper-friendly)

#### 1.10 Permit & concierge
*Reframed 2026-04-27 — IPA cases are admin-managed via admin UI; MOM eService automation deferred.*

The HelperHaven team files MOM submissions externally (logged into MOM eService with the EA licence) and reflects state back into the platform through the admin IPA UI. Same human-in-the-loop pattern as identity verification and PayNow allocation. Avoids the GovTech onboarding + integration cost until case volume justifies it.

- [ ] `permit_cases` lifecycle (DRAFT → IPA_SUBMITTED → IPA_APPROVED → ARRIVED → CARD_ISSUED → ACTIVE → terminated/transferred)
- [ ] **Admin IPA case management UI** — edit status, upload MOM-issued docs (IPA letter, WP card scan), record MOM reference numbers, transition state with reason text
- [ ] Employer-facing case timeline (read-only, sourced from admin updates)
- [ ] Document collection from employer + helper (passport, education, medical) → S3 prefix `regulated/`
- [ ] Append-only audit log on every admin transition (`audit_events` row per change)
- [ ] IPA / WP / SIP / runner / etc. fees expressed as catalogue line items (see §1.13), not hardcoded — billed via PayNow + admin verify
- [ ] Stuck-case alerts in admin queue (IPA_SUBMITTED > 14 days, ARRIVED > 7 days without medical, etc.)
- [ ] *Deferred:* `MomFilingClient` automated MOM eService integration — only build once case volume justifies the integration cost

#### 1.11 Termination & transfer pool
- [ ] `termination_cases` with resolution enum (`TRANSFER_TO_NEW_EMPLOYER`, `RETURN_HOME`, etc.)
- [ ] On `TRANSFER_TO_NEW_EMPLOYER`: flip `helper_profiles.available_for_transfer=true`
- [ ] Re-surface in matches with transfer-ready badge
- [ ] Existing reviews carry forward

#### 1.12 Helper questionnaire (multi-language) — added 2026-04-27
- [ ] `questionnaires` + `questions` + `question_translations` tables (en / id / my)
- [ ] Question types: free text, single-choice, multi-choice, scale 1–5
- [ ] Auto-language pick from `country_of_origin` (PH → en, ID → id, MM → my); user can switch
- [ ] Helper answers saved per question with version pinning
- [ ] Optional LLM-translation of free-text answers for employer view (marked auto-translated)
- [ ] Required-question gate before profile goes live
- [ ] Admin authoring UI for creating / versioning / translating questions

#### 1.13 Services catalogue & employer service orders — added 2026-04-27
*Admin-curated catalogue of fully-optional paid services (WP application, WP issuance, SIP, runner, medical exam coordination, insurance procurement, etc.). Surfaced when employer confirms a helper. Employer picks any subset (or none — they DIY the MOM filing). Same PayNow + admin-verify flow as credit packs. Delivery is **off-platform**: admin calls employer on their mobile to coordinate.*

- [ ] `service_catalogue_items` table: `code`, `name`, `description`, `price_sgd`, `applies_to` (`NEW_OVERSEAS` / `IN_SG_TRANSFER` / `BOTH`), `display_order`, `active` — no `mandatory_for` flag (every item optional)
- [ ] Admin CRUD UI for catalogue items + price changes (price changes audited; never affects placed orders)
- [ ] Seed catalogue at first deploy: WP_APPLICATION, WP_ISSUANCE, SIP, MEDICAL_EXAM_COORD, RUNNER_AIRPORT, RUNNER_CLINIC, INSURANCE_PROCUREMENT
- [ ] `service_orders` (header) + `service_order_items` (line items, snapshotted price)
- [ ] "Confirm this helper" CTA in match / chat surface — creates `permit_case` in `DRAFT` and triggers catalogue picker
- [ ] Catalogue picker: all items unchecked, employer opts in to subset, "Skip — I'll handle it myself" is a first-class option (no order created if so)
- [ ] Capture employer mobile number at order time (required) — stored on `users` if not already set
- [ ] Single PayNow QR for the bundled order; reuses `payment_orders` plumbing from 1.6
- [ ] "Our admin will call you within 1 working day" confirmation copy on order success
- [ ] Mid-case add-on flow (employer adds RUNNER_AIRPORT later → new `payment_orders` row, new line items)
- [ ] Admin "Mark paid" — atomic across `payment_orders`, every line item, audit row → surfaces in "ready to contact" queue
- [ ] Admin order-detail view shows employer's **mobile number** prominently + a contact-attempts notes field
- [ ] Admin marks line items `IN_PROGRESS` (with a free-text note about the call) and `DELIVERED` per service
- [ ] Cancellation + refund per line item (pre-`IN_PROGRESS` auto-refund; post-`IN_PROGRESS` manual)
- [ ] Employer-facing services timeline + assigned-concierge contact details on the case page
- [ ] Cost-transparency landing panel pulls from live catalogue (not hardcoded numbers)

### Phase 1 — Frontend (web)

- [ ] Auth pages (sign-up, login, password reset) — no OTP
- [ ] Helper onboarding wizard (profile → skills → experience → questionnaire → photos → ID upload → review)
- [ ] Employer onboarding (profile → hiring purpose → preferences → ID upload → buy credits via PayNow)
- [ ] PayNow QR purchase flow (show QR, allow receipt upload, "we'll allocate within 24h" status)
- [ ] Match search + filter UI (Direction A warmth applied)
- [ ] Match detail page with privacy-gated card unlock
- [ ] Chat UI with PII redaction live preview
- [ ] Reviews read + write
- [ ] Household management screen (calendar + to-do unified)
- [ ] Account / billing / credit history (PayNow order history)
- [ ] Apply Direction A warmth treatment to all screens (currently only mockups in `design/direction-a.html`)
- [ ] Caveat hand-accents and blush/butter post-its as per warmth direction
- [ ] Logo: Cottage in nav, sage Helper + clay Haven wordmark

### Phase 1 — Admin panel

- [ ] User search + impersonate
- [ ] **Identity-verification queue** (review uploaded ID + selfie, APPROVE / REJECT / REQUEST_MORE_INFO)
- [ ] **PayNow payment-verification queue** (match inbox to orders, allocate credits)
- [ ] **IPA case management UI** (edit state, upload MOM-issued docs, record MOM reference, transition with reason — replaces automated MOM eService integration at MVP)
- [ ] **Services catalogue authoring UI** (CRUD for catalogue items + pricing, audited)
- [ ] **Service order delivery tracking** (per line item: PENDING_PAYMENT → PAID → IN_PROGRESS → DELIVERED / CANCELLED)
- [ ] Permit case viewer + state transition (cross-case overview, stuck-case alerts)
- [ ] Manual refund button
- [ ] Abuse report queue (`message_reports`)
- [ ] Termination case viewer
- [ ] Questionnaire authoring (questions + en/id/my translations)
- [ ] Daily reconciliation report (unmatched PayNow / orders)
- [ ] Audit log viewer

### Phase 2 — Staging on AWS Lightsail

- [ ] Provision Lightsail Singapore instance (4 GB / 2 vCPU)
- [ ] Provision Lightsail managed Postgres
- [ ] Cloudflare DNS: `staging.helperhaven.sg` → Lightsail static IP
- [ ] Caddy on instance for auto-TLS
- [ ] S3 bucket `helperhaven-staging` ap-southeast-1 with SSE-KMS
- [ ] IAM user with bucket-scoped policy
- [ ] GitHub Actions: build → push to GHCR → SSH-pull on staging
- [ ] First Flyway run on fresh staging DB; verify V1→V4 apply cleanly
- [ ] PayNow test UEN configured in staging (admin can practise the verification flow)
- [ ] Admin seed account so a staff member can exercise identity-verification + IPA queues end-to-end
- [ ] Run full happy-path: helper signup → employer signup → unlock → chat → review
- [ ] Backup drill: snapshot Lightsail Postgres → restore to second instance → query check
- [ ] Synthetic load test (50 concurrent simulated users) to confirm sizing

### Phase 3 — Production cutover

Pick path:

#### Path A — Stay on Lightsail (~S$55/mo)
- [ ] New Lightsail instance for `app.helperhaven.sg`
- [ ] Cloudflare DNS cutover with TTL 300
- [ ] PayNow live UEN configured (admin verifies real payments)
- [ ] Admin staff accounts provisioned for identity / PayNow / IPA queues
- [ ] SES verified domain for outbound mail
- [ ] UptimeRobot 5-min ping
- [ ] BetterStack log shipping (free tier)
- [ ] First nightly backup verified by restore drill

#### Path B — Sensible-tier AWS (~S$130/mo)
- [ ] Terraform / CDK skeleton for VPC, ALB, EC2, RDS, S3, CloudFront, Secrets, KMS
- [ ] EC2 t4g.medium with docker-compose deploying app + admin containers
- [ ] RDS db.t4g.small Single-AZ Postgres 16, automated backups 7d
- [ ] ElastiCache Redis t4g.micro
- [ ] ALB with sticky sessions + WS upgrade enabled
- [ ] CloudFront + S3 for React bundle
- [ ] S3 buckets: `hh-prod-public`, `hh-prod-regulated` (KMS), `hh-prod-self-reported`
- [ ] Secrets Manager entries: DB, JWT signing key (Stripe / KYC vendor entries dropped 2026-04-27)
- [ ] CloudWatch alarms: 5xx rate, RDS CPU/storage, ALB 5xx
- [ ] WAF rules (managed rule set + rate limit)
- [ ] DNS cutover from Lightsail → ALB

### Phase 4 — Hardening (post-launch)

- [ ] Restore drill on a fresh AWS account every quarter
- [ ] 1-yr Compute Savings Plan (~30% off) once stable for 60 days
- [ ] 1-yr RDS Reserved Instance
- [ ] Multi-AZ RDS once monthly revenue > S$500
- [ ] Read replica for matches search if it gets hot
- [ ] Penetration test before public launch
- [ ] SOC 2-lite hygiene: access reviews, change log, data retention policy
- [ ] PDPA data-deletion endpoint (helper / employer can request full erase)
- [ ] Singpass MyInfo integration revisited (deferred per 2026-04-24 decision)

### Cross-cutting / always-on

- [ ] Synthetic seed data only — no real PII in dev or staging
- [ ] Postgres `TIMESTAMPTZ` everywhere; JVM `-Duser.timezone=UTC`; format SGT only at React layer
- [ ] Append-only audit log table, never `UPDATE`
- [ ] Same code path for sandbox vs live — only credentials differ
- [ ] Never edit a past Flyway migration; always add Vn+1
- [ ] Logs: JSON to stdout; no PII in log lines

---

## 4. Decisions log (cross-reference)

Confirmed in `~/.claude/projects/.../memory/project_decisions.md`:

- Market: Singapore employers, helpers from ID/MM/PH
- Helper self-signup allowed
- **Third-party agencies dropped (2026-04-27)** — HelperHaven is the only EA-licensed entity in the model
- 100-point budget skill model (5 metrics)
- Chat-first pivot: no video, **S$15/5 · S$40/15** (agency S$100/50 dropped 2026-04-27), 48h auto-refund, two-way reviews, CARD_ISSUED gate
- Helper experiences self-reported, no validation
- **No SMS/WhatsApp OTP (2026-04-27)** — verification is admin-reviewed manual ID + selfie
- **No third-party KYC vendor (2026-04-27)** — admin reviews uploaded docs
- **PayNow + admin allocation instead of Stripe (2026-04-27)**
- **Helper questionnaire is multi-language: en / id / my (2026-04-27)**
- **Household to-do list added to calendar surface (2026-04-27)**
- **IPA case management is admin-UI-driven (2026-04-27)** — MOM eService automation deferred; admin staff update permit cases manually
- **Services catalogue is admin-curated, fully optional, off-platform delivery (2026-04-27)** — employer picks any subset (or none) at confirm-helper time; admin contacts employer by mobile to coordinate; same PayNow + admin-verify flow as credit packs
- **Chat check-in cron (2026-04-27)** — system periodically asks the employer "did you find someone?" once a chat is ≥7 days old; answers feed conversion analytics + flag off-platform poaching for counsellor follow-up
- **Helper anti-ghosting / inactivity rule (2026-04-27)** — every `UNLOCK_REFUND_AUTO` increments helper's consecutive-non-reply counter; at X = 3 consecutive non-replies (configurable) profile flips `LIVE → INACTIVE` (not in search, not unlockable); helper login flips it back to `LIVE`. Any first-reply resets counter to 0.
- Singpass MyInfo deferred
- Brand: warm, homely, mission-forward — bridge the agency gap
- Logo: Cottage (Concept 2)
- Region: ap-southeast-1
- MOM EA licence held → can file Work Permits day one

---

## 5. Open questions

- ~~**How is identity verified?**~~ Resolved 2026-04-27. Admin manual review. Employers: NRIC/FIN at signup. Helpers: passport bio page before profile goes live in search (not at signup). Profile state machine handles the in-between.
- ~~**Should MOM eService be auto-integrated?**~~ Resolved 2026-04-27. No — admin staff file submissions externally and update IPA case state via admin UI. Defer automated `MomFilingClient` integration until case volume justifies it.
- Production path: Lightsail (cheap, simple) vs sensible-tier AWS (proper) — decide before Phase 3
- Photography vs illustration for human imagery in marketing surfaces
- Apply warmth treatment to remaining mockup screens (Matches, Chat, Reviews, Calendar)
- Will questionnaire questions be hand-curated by HelperHaven, or also editable per-helper? (Currently planned: HH-curated only.)
- Should employer's hiring-purpose be free text only, structured tags only, or both? (Currently planned: both.)
- PayNow QR generation: use `paynow-qr` library directly (UEN + amount + reference), or go through HitPay-style aggregator that emits webhooks? Aggregator removes the manual admin step but adds ~2% fee.
- Services catalogue: should the seed prices be visible on the marketing site even before signup, or only after sign-up + helper confirmation? (Current plan: visible on landing for cost-transparency.)
- Chat check-in cadence: 7 days then every 7? Or 7 / 14 / 30 escalating? (Current plan: every 7 with quiet defaults — one in-app prompt, one email, never repeated.)
- `FOUND_OUTSIDE_HH` follow-up: counsellor reaches out by email only (gentle), or also by phone? (Current plan: email; phone only on opt-in.)
