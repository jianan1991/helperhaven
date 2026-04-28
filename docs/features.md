# HelperHaven — feature catalog

Everything in plan today, grouped by surface. Status legend: `[x]` shipped · `[~]` spec'd or partially built · `[ ]` not started.

Cross-references: see `roadmap.md` for phasing, `data-model.md` for schema. Last touched: 2026-04-27.

---

## A. Identity & signup

Per 2026-04-27 decision: **no third-party KYC vendor, no SMS/WhatsApp OTP.** Verification is **manual review by HelperHaven admin** of uploaded ID + selfie.

**Document type by role:**

| Role | Document | When required |
|---|---|---|
| Employer (Singaporean / PR) | **NRIC (IC) — front + back** | At signup, before any payment |
| Employer (foreigner in SG) | **FIN card — front + back** | At signup, before any payment |
| Helper (overseas, PH/ID/MM) | **Passport bio page** | Before profile goes live in search (NOT at signup) |
| Helper (in-SG, transfer pool) | **Work Permit Card + Passport bio page** | Before profile goes live in search |

All roles also upload a **selfie holding the document** as a liveness check. Documents land in S3 prefix `regulated/` with SSE-KMS.

| | Feature | Notes |
|---|---|---|
| `[~]` | Email + password signup | User entity skeleton exists; auth flow not built |
| `[ ]` | Email verification link | Confirms inbox before account is usable |
| `[ ]` | Roles: helper / employer / admin | Agency role removed 2026-04-27 |
| `[ ]` | **Employer**: NRIC/FIN (front + back) + selfie upload **at signup** | Blocks payment + IPA filing until verified |
| `[ ]` | **Helper**: Passport bio page + selfie upload **before going live in search** | Helper can build profile / questionnaire first; passport gates discoverability |
| `[ ]` | Helper profile state machine: `DRAFT` → `PENDING_VERIFICATION` → `LIVE` / `REJECTED` | Allows passport-less helpers to keep building their profile |
| `[ ]` | Admin review queue: APPROVE / REJECT / REQUEST_MORE_INFO | Replaces vendor-driven KYC |
| `[ ]` | Verification status on user: `PENDING` → `VERIFIED` / `REJECTED` | Gates listing + payment |
| `[ ]` | Automated NRIC/FIN checksum check (S/T/F/G prefix algorithm) | Cheap pre-filter before admin sees the queue |
| `[ ]` | Optional automated passport MRZ parse | Pre-fills name/DOB/expiry for admin to confirm |
| `[ ]` | Account suspension / blocklist | Manual admin action |
| `[ ]` | Step-up password re-entry for sensitive actions | Replaces re-OTP (payout method change, refund, etc.) |
| `[ ]` | PDPA data-deletion endpoint | "Erase my account" with cascade |
| `[ ]` | Singpass / MyInfo (deferred) | Revisit at scale per 2026-04-24 decision |

## B. Helper profile

**Profile state machine** (added 2026-04-27, extended 2026-04-27 evening with `INACTIVE`):

```
   Onboarding path
   ─────────────────
   DRAFT ──► COMPLETE_NO_PASSPORT ──► PENDING_VERIFICATION ──► LIVE
                                              │ admin rejects
                                              ▼
                                         REJECTED

   Post-LIVE transitions
   ─────────────────────
   LIVE ◄──────► HIDDEN          (helper toggles privacy)
   LIVE ──► INACTIVE             (system: X consecutive employer chats with no first-reply)
   INACTIVE ──► LIVE             (helper logs in; counter resets to 0)

   Discoverability rule: helper appears in employer search iff state = LIVE
   AND not admin-suspended.
```

**Inactivity / anti-ghosting rule** (added 2026-04-27 evening). Each time an unlock auto-refunds (`UNLOCK_REFUND_AUTO`, the 48h sweep — see §F), the helper's `consecutive_unlocks_without_reply` counter increments. Any first-reply burn (or a late first-reply after the refund window) resets it to 0. When the counter hits **X = 3** (configurable via `AppProperties.helperInactivityThreshold`), the helper's state flips `LIVE → INACTIVE`. INACTIVE helpers don't appear in search and can't be newly unlocked, but existing conversations remain accessible. The helper auto-flips back to `LIVE` on next successful login (counter resets, audit row written). One warning email is sent at counter == X-1 ("two employers haven't heard back from you — one more and your profile pauses").

| | Feature | Notes |
|---|---|---|
| `[~]` | Core details (name, age, nationality, languages) | Schema in V1 |
| `[ ]` | Profile + lifestyle photos to S3 | Presigned upload |
| `[~]` | 100-point skill budget across 5 metrics | Schema seeded V2; UI mockup done |
| `[~]` | Sub-tag flags (Cooking-Halal, Pet care, Newborn, Dementia, Drives, Live-in, Newborn experience) | Yes/no, filterable, no point cost |
| `[x]` | Self-reported work history (V4 `helper_experiences`) | Migration shipped, "Self-reported" label baked into model |
| `[~]` | Auto-derived signature (Specialist carer / All-rounder / Home & kitchen) | Logic spec'd in memory |
| `[ ]` | Profile state: `DRAFT` / `COMPLETE_NO_PASSPORT` / `PENDING_VERIFICATION` / `LIVE` / `HIDDEN` / `INACTIVE` / `REJECTED` | Helpers without a passport yet can still build profile + questionnaire; `INACTIVE` is system-set when helper ghosts X employers in a row |
| `[ ]` | `consecutive_unlocks_without_reply` counter on helper_profiles | Increments on `UNLOCK_REFUND_AUTO`, resets on any first-reply or login |
| `[ ]` | "Almost there — upload your passport to go live" prompt | Surfaced on dashboard while in `COMPLETE_NO_PASSPORT` |
| `[ ]` | Available-for-transfer flag | V3 column exists; UI + workflow TBD |
| `[ ]` | Helper-side English level self-declaration | Verified later via review |
| `[ ]` | Origin-country reference contacts (optional) | Phone-verified by HH staff |

## C. Employer profile

| | Feature | Notes |
|---|---|---|
| `[ ]` | Core details, household description | |
| `[ ]` | **Hiring-purpose declaration** | Free text + structured tags: "Care for elderly parent", "Newborn / infant care", "Both parents working full-time", "Special-needs household member", etc. Surfaced on match cards so helpers know what they're applying to. |
| `[ ]` | Helper preferences (5-vector skill weights) | Mirror of helper budget |
| `[ ]` | Required / nice-to-have sub-tags | Cooking-Halal, drives, live-in, etc. |
| `[ ]` | Preferred nationality / age band / language | Soft-filter, not hard-block |
| `[ ]` | Salary band, expected start date, working arrangement | Live-in / live-out |
| `[ ]` | Income proof upload (NOA / payslip) at IPA stage | MOM ≥ S$3k/month rule |
| `[ ]` | Household members, special needs flags | Elderly, infants, pets, dietary |
| `[ ]` | Profile photo (optional) | |

## C2. Helper questionnaire (multi-language)

Per 2026-04-27 decision. Helpers complete a structured questionnaire during onboarding. Questions provided by HelperHaven; **delivered in three languages**: English (Filipino helpers), Bahasa Indonesia (Indonesian helpers), Burmese (Myanmar helpers). Answers surface on the helper's public profile and feed into match quality.

| | Feature | Notes |
|---|---|---|
| `[ ]` | Questionnaire schema (versioned, multi-language) | `questionnaires` + `questions` + `question_translations` tables |
| `[ ]` | Three locales: `en`, `id`, `my` | Helper sees questions in own language; employer sees translated answers |
| `[ ]` | Question types: free text, single-choice, multi-choice, scale 1–5 | |
| `[ ]` | Auto-language pick from helper's `country_of_origin` | PH → en, ID → id, MM → my; user can switch |
| `[ ]` | Helper answers saved per question with version pinning | So changing the form doesn't invalidate old answers |
| `[ ]` | Translation of free-text answers for employer view | LLM-assisted, optional, marked "auto-translated" |
| `[ ]` | Admin questionnaire authoring UI | Edit/version questions, manage translations |
| `[ ]` | Display answers on helper profile + match card | Grouped by topic |
| `[ ]` | Required-question gate before profile goes live | Helper must complete all required Qs |



| | Feature | Notes |
|---|---|---|
| `[ ]` | Search + filter (country, age, sub-tags, salary, transfer-ready) | |
| `[ ]` | Ranked match score = dot product (helper 5-vec × employer 5-vec) | |
| `[~]` | Privacy-gated match card (blur photo + name until unlocked) | UI mockup done; backend TBD |
| `[ ]` | "★ In SG · transfer ready · can start in 7 days" badge | Surfaced in every list |
| `[ ]` | Shortlist / save | |
| `[ ]` | Daily match recommendations email | |
| `[ ]` | "New matches since last visit" indicator | |

## E. Chat

| | Feature | Notes |
|---|---|---|
| `[~]` | 1:1 conversation gated on credit unlock | Schema in V3; transport TBD |
| `[ ]` | WebSocket real-time delivery | Spring WebFlux |
| `[~]` | PII redaction filter (phone, email, NRIC, addresses) | Server-side enforced; mockup demos it |
| `[ ]` | Image attachments via presigned URL | |
| `[ ]` | Read receipts + typing indicators | |
| `[ ]` | Translation hints (helper-language → English) | LLM-assisted, optional |
| `[ ]` | Message reports → admin queue | `message_reports` table V3 |
| `[ ]` | 30-day thread expiry + archive | Per chat pivot decision |
| `[ ]` | "Talk to HelperHaven counsellor" private channel | Anti-coercion / agency-bypass |
| `[ ]` | Quoted-reply, reactions | |
| `[ ]` | **Periodic "did you find someone?" check-in** | Once an employer has been actively chatting (>= 7 days since first unlock, then every 7 days), the system asks: "Are you still looking, did you decide on a helper, or did you find someone outside HelperHaven?" Three buttons, one click. Surfaces in-app + email reminder. |
| `[ ]` | Check-in answer states: `STILL_LOOKING` / `DECIDED_HELPER_X` / `FOUND_OUTSIDE_HH` / `NOT_HIRING_ANYMORE` | `DECIDED_HELPER_X` deep-links into the §Q confirm-helper flow. `FOUND_OUTSIDE_HH` flags the conversation for admin review (off-platform poaching detection). |
| `[ ]` | `chat_checkins` table: `employer_id`, `conversation_id`, `helper_id`, `prompted_at`, `answered_at`, `answer`, `notes` | Append-only — every prompt is a row, employer can answer same prompt only once |
| `[ ]` | Admin queue for `FOUND_OUTSIDE_HH` cases | Counsellor reaches out: "Glad you found someone — was it through us originally? We're trying to learn what works." Optional, never coercive. |
| `[ ]` | Conversion / matching effectiveness dashboard | Aggregate: % of chats that lead to a confirmed helper within 30 days; helps tune matching |

## F. Credits & PayNow payments

Per 2026-04-27 decision: **PayNow QR + admin-verified manual allocation.** No Stripe. Aligns with SG-local payment habits and avoids merchant-account / card-fee complexity at MVP. Removes agency tier (S$100/50) since agencies are out of scope.

**Verification rule (cross-cutting):** for ANY PayNow payment — credit packs here, IPA / concierge fees in §H, services orders in §Q — admin manually confirms the funds landed in the HelperHaven UEN before allocating credits / marking the order paid / starting service delivery. Never auto-allocate. The admin "Mark paid" action is atomic: it updates `payment_orders.status = PAID`, writes the credit ledger row (or service-order delivery row), and writes an `audit_events` row in one transaction.

| | Feature | Notes |
|---|---|---|
| `[~]` | Two credit packs: **S$15 / 5 unlocks**, **S$40 / 15 unlocks** | V3 seed will be revised in a future migration; agency S$100/50 pack dropped |
| `[ ]` | PayNow QR generation | Dynamic QR with embedded reference number (HH-{6-digit}-{userId-suffix}) |
| `[ ]` | Order created in `PENDING_PAYMENT` state on QR generation | Expires in 30 min if no admin confirmation |
| `[ ]` | Receipt-screenshot upload by user (optional convenience) | Stored against order; admin views in queue |
| `[ ]` | **Admin payment-verification queue** | Admin matches PayNow inbox entries to orders by reference + amount |
| `[ ]` | Admin "Mark paid → allocate credits" action | Atomic: order → PAID, credit balance += pack, ledger row written |
| `[ ]` | Reserve credit on unlock | |
| `[ ]` | Burn on helper first reply | Service-layer rule |
| `[ ]` | 48-hour auto-refund sweep (`UNLOCK_REFUND_AUTO`) | Cron job; ALSO increments helper's `consecutive_unlocks_without_reply` counter (see §B inactivity rule) |
| `[ ]` | Helper inactivity flip on counter ≥ X | At threshold (default X=3, `AppProperties.helperInactivityThreshold`), helper state → `INACTIVE`, audit row written. Warning email at X-1. |
| `[ ]` | Counter reset on first-reply (or any late first-reply) | Engagement signal — any reply resets to 0, even one received after the 48h refund window |
| `[ ]` | Login-side `INACTIVE → LIVE` re-activation | Auth service flips state on successful helper login, resets counter, writes audit row, shows "welcome back, your profile is visible again" toast |
| `[ ]` | Manual admin refund (`UNLOCK_REFUND_MANUAL`) | |
| `[ ]` | Credit ledger query (finance / user-facing history) | |
| `[ ]` | Receipts (PDF email + downloadable) | |
| `[ ]` | Concierge fee invoice (~S$450) at IPA stage | Now expressed as catalogue line items (see §Q), same PayNow + admin-verify flow |
| `[ ]` | Daily reconciliation report for admin | Unmatched payments / orders highlighted |

## G. Reviews & trust

| | Feature | Notes |
|---|---|---|
| `[ ]` | Two-way reviews (employer ↔ helper) | Schema in V3 |
| `[ ]` | Stars + free text + flag-tag chips (punctual / honest / patient / etc.) | |
| `[ ]` | English-level enum (helper-side) | |
| `[ ]` | Verified 5-metric breakdown alongside helper self-rating | "Honest self-assessor" signal |
| `[~]` | DB-enforced gate: `permit_cases.status >= CARD_ISSUED` | CHECK + service layer |
| `[ ]` | Reviews follow helper across employers (transfer pool) | |
| `[ ]` | Public visibility flag + employer-only privacy | `reviews.visibility` |
| `[ ]` | Right to respond (one reply per review) | |

## H. Permit & MOM concierge

Per 2026-04-27 decision: **IPA cases are admin-managed via the admin UI, not auto-filed against MOM eService.** HelperHaven staff log into MOM's eService directly (outside the platform) using the EA licence, and reflect the case state back into HelperHaven through the admin UI. The `MomFilingClient` interface is deferred — manual admin updates are the MVP path. Same pattern as identity verification and PayNow allocation: humans in the loop, simple plumbing.

| | Feature | Notes |
|---|---|---|
| `[~]` | Permit case lifecycle: DRAFT → IPA_SUBMITTED → IPA_APPROVED → ARRIVED → CARD_ISSUED → ACTIVE → terminated states | Enums in V3 |
| `[ ]` | **Admin IPA case management UI** | Admin can edit status, upload MOM-issued docs (IPA letter, WP card scan), record MOM reference numbers, transition state manually with reason text |
| `[ ]` | Employer-facing case timeline (read-only) | "Submitted to MOM 2026-05-03 · IPA approved 2026-05-08 · Helper arrived…" — sourced from admin updates |
| `[ ]` | Document collection from employer + helper (passport, education, medical) | S3 prefix `regulated/` |
| `[ ]` | Append-only audit log on every transition | Every admin update writes an `audit_events` row (who, what, when, before/after) |
| `[ ]` | IPA fee handling (~S$35) — billed via §Q services catalogue line item | |
| `[ ]` | Medical exam booking flow | At MOH-approved clinics |
| `[ ]` | SIP (Settling-in Programme) attendance tracking | Admin records attendance from MOM confirmation |
| `[ ]` | Work Permit card issuance tracking | Admin marks `CARD_ISSUED` once physical card collected |
| `[ ]` | Renewal reminders (every 2 years) | Cron + admin queue |
| `[ ]` | Termination filing with MOM | Admin handles via MOM eService externally; updates state in app |
| `[ ]` | Cross-employer transfer paperwork | Admin-driven |
| `[ ]` | `MomFilingClient` automated integration | **Deferred** — revisit only if case volume justifies the integration cost |

## I. Household management (calendar + to-do)

Renamed and expanded 2026-04-27 to include shared household to-do list. Same surface in the UI: a single calendar/tasks tab with leave on top, daily/weekly tasks below.

### I.1 Calendar (existing)

| | Feature | Notes |
|---|---|---|
| `[~]` | Helper leave requests → employer approve / decline | `leave_requests` V3 |
| `[~]` | Employer "you're off" days | |
| `[~]` | Weekly rest-day rule (MOM mandatory) | `rest_day_rules` V3 |
| `[~]` | Auto-populated SG public holidays | `sg_public_holidays` V3 |
| `[~]` | Leave balances per helper-employment | `leave_balances` V3 |
| `[ ]` | iCal export (employer + helper) | |
| `[ ]` | Conflict warnings (overlap with rest day / PH) | |
| `[ ]` | Compensation-day tracking when rest day is worked | |
| `[~]` | UI mockup (Direction A) | Done in `design/direction-a.html` |

### I.2 Household to-do list (new)

| | Feature | Notes |
|---|---|---|
| `[ ]` | Tasks per household (linked to active permit case) | New `household_tasks` table |
| `[ ]` | One-off tasks + recurring rules (daily, weekly on specific days) | RRULE-style |
| `[ ]` | Status: `PENDING` / `DONE` / `SKIPPED` per occurrence | Per-occurrence row in `household_task_events` |
| `[ ]` | Employer creates / edits tasks | "Cook lunch by 12pm", "Vacuum living room", "Pick up kids 3pm" |
| `[ ]` | Helper marks done with optional photo + note | Photo proves done, doubles as gentle accountability |
| `[ ]` | Translated task description for helper (English ↔ Bahasa / Burmese) | Optional, opt-in per helper |
| `[ ]` | Daily summary view for both sides | "X done, Y pending today" |
| `[ ]` | Weekly completion rate visible on profile after contract | Light reputation signal, NOT used for review override |
| `[ ]` | Quiet defaults: no harassment / nag notifications | Helper-friendly. One reminder, not five. |

## J. Termination & transfer pool

| | Feature | Notes |
|---|---|---|
| `[~]` | Termination case schema (`termination_cases` V3) | |
| `[~]` | Resolution enums: `TRANSFER_TO_NEW_EMPLOYER` / `RETURN_HOME` / `MOM_DISPUTE` / etc. | V3 |
| `[~]` | Permit status enums: `TERMINATED_EARLY_*` / `TRANSFER_*` | V3 |
| `[ ]` | Auto-flip `helper_profiles.available_for_transfer = true` on transfer resolution | |
| `[ ]` | Re-surface in matches with transfer-ready badge | |
| `[ ]` | 7-day fast-match (no IPA wait, in-SG) | |
| `[ ]` | Reviews carry forward across employers | |
| `[ ]` | Termination concierge workflow (admin-assisted) | |
| `[ ]` | MOM dispute support flow | |

## K. Agency features — REMOVED 2026-04-27

Third-party agencies are no longer supported. HelperHaven itself is the licensed agency (the user holds the MOM EA licence); helpers self-onboard or are concierge-onboarded by HH staff. The S$100/50 agency credit pack is dropped from the seed.

Implication: helpers and employers are the only signup roles. `agencies` schema if ever introduced should remain unused.

## L. Admin panel

| | Feature | Notes |
|---|---|---|
| `[~]` | Skeleton bundle exists | `admin/` package; no pages yet |
| `[ ]` | User search + impersonate | |
| `[ ]` | **Identity-verification queue** (ID + selfie review) | Replaces KYC vendor; APPROVE / REJECT / REQUEST_MORE_INFO |
| `[ ]` | **PayNow payment-verification queue** | Match PayNow inbox to orders by reference + amount, allocate credits |
| `[ ]` | **IPA case management UI** | Admin edits permit case state, uploads MOM-issued docs, records MOM reference numbers, transitions state with reason text. Replaces automated MOM eService integration at MVP. |
| `[ ]` | Permit case viewer + state transition | Read across all cases; surfaces stuck cases (IPA_SUBMITTED > 14d, ARRIVED > 7d without medical, etc.) |
| `[ ]` | Manual refund button | Writes `UNLOCK_REFUND_MANUAL` |
| `[ ]` | Abuse report queue (`message_reports`) | |
| `[ ]` | Termination case viewer + decision | |
| `[ ]` | Audit log viewer | Read-only, append-only source |
| `[ ]` | Suspension / unblock | |
| `[ ]` | Questionnaire authoring (Q + translations) | Editor for English / id / my versions |
| `[ ]` | **Services catalogue authoring** | CRUD for catalogue items (code, name, description, price, applies-to case type, mandatory flag, display order, active toggle) — see §Q |
| `[ ]` | **Service order delivery tracking** | Per-line-item status: `PENDING_PAYMENT` → `PAID` → `IN_PROGRESS` → `DELIVERED` / `CANCELLED`; admin advances state with reason text |
| `[ ]` | Daily reconciliation report (PayNow vs orders) | Includes both credit-pack orders and service orders |

## M. Notifications

OTP delivery dropped 2026-04-27 — see Section A. Channels remain in plan for product notifications (match alerts, payment confirmation, leave decisions, review prompts).

| | Feature | Notes |
|---|---|---|
| `[~]` | Email — Mailhog (dev) / SES (prod) | Mailhog wired in compose |
| `[ ]` | SMS — AWS End User Messaging | Optional; product notifications only, not OTP |
| `[ ]` | WhatsApp — Cloud API | Optional; product notifications only |
| `[ ]` | In-app notification centre | |
| `[ ]` | User notification preferences (per channel × per event) | |
| `[ ]` | Mute / quiet hours | |

## N. Cross-cutting / platform

| | Feature | Notes |
|---|---|---|
| `[~]` | PII boundary: `regulated/` vs `self-reported/` vs `public/` S3 prefixes | Bucket policy TBD |
| `[ ]` | Append-only audit log table (`audit_events`) | |
| `[ ]` | Synthetic seed data only — no real PII anywhere off-prod | `R__seed_dev.sql` not yet written |
| `[~]` | UTC timestamps everywhere | Postgres `TIMESTAMPTZ` |
| `[~]` | JSON-structured logs to stdout | Spring config TBD |
| `[~]` | Health check endpoints | `HealthController` exists |
| `[ ]` | Rate limiting (Redis sliding window) | Per-IP, per-user |
| `[ ]` | Feature flags (LaunchDarkly-style or custom) | Optional |
| `[ ]` | Versioned API (`/v1/...`) | |
| `[ ]` | OpenAPI / Swagger doc generation | |
| `[ ]` | Sentry-style error reporting | BetterStack or self-hosted |
| `[ ]` | Backup + restore drills (quarterly) | |

## O. Branding & design

| | Feature | Notes |
|---|---|---|
| `[x]` | Direction A palette (sage / clay / cream + blush + butter warmth layers) | `design/direction-a.html` |
| `[x]` | Logo: Cottage mark (Concept 2) | `design/logo.html` |
| `[x]` | Wordmark: sage "Helper" + clay "Haven" | |
| `[x]` | Typography stack: Fraunces / Inter / Caveat | |
| `[x]` | Mockup screens: Home, Skills, Experience, Matches, Chat, Reviews, Calendar | 7 screens, Direction A |
| `[x]` | Mission-forward landing copy (bridge agency gap) | |
| `[x]` | Pricing transparency (agency vs HelperHaven side-by-side) | |
| `[ ]` | Apply warmth treatment to remaining live screens | Currently mockup-only |
| `[ ]` | Photography vs illustration decision for human imagery | |
| `[ ]` | Dark mode (low priority) | |

## P. Infra & ops

| | Feature | Notes |
|---|---|---|
| `[x]` | Docker Compose with postgres, redis, minio, minio-init, mailhog, backend, frontend-web, admin | `infra/docker-compose.yml` |
| `[x]` | Flyway migrations V1 (baseline) → V4 (helper experiences) | |
| `[ ]` | V5 migrations TBD | OTP V5 dropped 2026-04-27. Next migrations likely: questionnaires, household_tasks, payment_orders, manual identity verification |
| `[ ]` | Makefile targets (`up / down / migrate / seed / reset / test`) | |
| `[ ]` | `R__seed_dev.sql` synthetic seed | |
| `[ ]` | `.env.example` audited for clean clone | |
| `[ ]` | GitHub Actions: build → push image → deploy | |
| `[ ]` | Lightsail Singapore staging instance | |
| `[ ]` | Cloudflare DNS + Tunnel / Caddy TLS | |
| `[ ]` | Cloudflare R2 nightly Postgres backups | |
| `[ ]` | UptimeRobot 5-min ping | |
| `[ ]` | CloudWatch Logs (or BetterStack) shipping | |
| `[ ]` | Production AWS deployment (Lightsail or sensible-tier) | |

## Q. Services catalogue & employer service orders

Per 2026-04-27 decision. Admin-curated catalogue of **fully optional** paid services HelperHaven offers (Work Permit application, Work Permit issuance, Settling-in Programme registration, runner / airport-pickup, medical-exam coordination, insurance procurement, etc.). Surfaced to the employer at **"confirm a helper"** time — the moment they pick the helper they want to hire. Employer picks any subset (or none — they can DIY the MOM filing themselves). Same PayNow + admin-verify flow as credit packs (§F).

**Delivery model is off-platform.** Once admin confirms payment received, admin contacts the employer **out-of-band by mobile phone** (and/or WhatsApp) to coordinate the actual service delivery. The platform tracks the purchase order header + line-item state, but the work itself happens off-system. Same human-in-the-loop pattern that runs through identity verification, PayNow allocation, and IPA case management.

This is the second money flow in the platform. Conceptually distinct from chat credits:
- **§F credit packs** = small recurring purchases for chat unlocks
- **§Q service orders** = larger optional one-time-per-case purchases tied to a specific employer-helper pairing, delivered off-platform via phone/WhatsApp coordination

### Q.1 Catalogue (admin-curated)

| | Feature | Notes |
|---|---|---|
| `[ ]` | `service_catalogue_items` table | Fields: `id`, `code` (e.g. `WP_APPLICATION`, `WP_ISSUANCE`, `SIP`, `RUNNER_AIRPORT`, `RUNNER_CLINIC`, `MEDICAL_EXAM_COORD`, `INSURANCE_PROCUREMENT`), `name`, `description`, `price_sgd`, `applies_to` (`NEW_OVERSEAS` / `IN_SG_TRANSFER` / `BOTH`), `display_order`, `active`, `created_at`, `updated_at` |
| `[ ]` | Admin CRUD UI to add / edit / retire items + change pricing | Retiring keeps history intact (don't delete; flip `active=false`) |
| `[ ]` | Price-history audit | Every price change writes an `audit_events` row; placed orders snapshot the price at order time so re-pricing never affects existing orders |
| `[ ]` | Seed catalogue at first deploy | WP application, WP issuance, SIP, medical exam coordination, runner (airport / clinic / MOM office), insurance procurement |

No `mandatory_for` flag. Every item is optional — the employer can take all of them, some, or none. If they take none, they handle MOM filing themselves (legal — SG employers can file Work Permits directly without an agency).

### Q.2 Confirm-helper flow (employer-facing)

| | Feature | Notes |
|---|---|---|
| `[ ]` | "Confirm this helper" CTA in match / chat surface | Creates a `permit_case` row in `DRAFT` for the (employer, helper) pair |
| `[ ]` | Catalogue picker shown at confirm time | All items are unchecked checkboxes — employer opts in to whichever they want; "Skip — I'll handle it myself" is a first-class option |
| `[ ]` | Live total + line-item summary | Single number; if employer skips everything, no order is created |
| `[ ]` | Single PayNow QR for the bundle | One `payment_orders` row, multiple `service_order_items` rows under it |
| `[ ]` | Employer mobile number captured at order time (if not already on profile) | Required field — admin uses it to coordinate service delivery off-platform |
| `[ ]` | "Our admin will call you within 1 working day to coordinate" copy on success page | Sets expectation that delivery happens off-platform |
| `[ ]` | Mid-case add-ons | Employer can add optional items later (e.g. add `RUNNER_AIRPORT` after IPA approved); creates a follow-up `payment_orders` row |
| `[ ]` | Read-only timeline of services | "WP_APPLICATION · paid 2026-05-04 · admin contacted 2026-05-04 · in progress · delivered 2026-05-08" |

### Q.3 Order + delivery model (off-platform)

| | Feature | Notes |
|---|---|---|
| `[ ]` | `service_orders` table — header, FK to `permit_case`, FK to `payment_order` | One per checkout; multiple per case allowed |
| `[ ]` | `service_order_items` table — line items, FK to `service_catalogue_items`, snapshotted price | Status enum per line: `PENDING_PAYMENT` → `PAID` → `IN_PROGRESS` → `DELIVERED` / `CANCELLED` |
| `[ ]` | Admin "Mark paid" action — atomic | Confirms PayNow receipt, flips order to `PAID`, flips all line items to `PAID`, writes audit row, surfaces order in admin's "ready to contact" queue |
| `[ ]` | Admin order-detail view | Shows employer name + **mobile number prominently**, list of paid line items, optional "log of contact attempts" notes field |
| `[ ]` | Admin marks `IN_PROGRESS` after first contact | "Called employer 2026-05-04, agreed on docs handover Friday" — free-text note, audited |
| `[ ]` | Admin marks `DELIVERED` per line item | Per-item; actual work happens off-platform via phone/WhatsApp/in-person |
| `[ ]` | Cancellation + refund per line item | Pre-`IN_PROGRESS` cancellable with auto-refund; post-`IN_PROGRESS` requires manual admin call |
| `[ ]` | Audit log on every state change | Same `audit_events` table as identity / IPA / payment |

### Q.4 Display rules

| | Feature | Notes |
|---|---|---|
| `[ ]` | Catalogue surfaces in employer flows: confirm-helper, case timeline, billing history | |
| `[ ]` | Helper does NOT see catalogue line items / pricing | Service orders are between employer and HH admin only |
| `[ ]` | Cost-transparency comparison surfaces use catalogue prices | The "agency vs HelperHaven" panel on landing should pull from live catalogue, not hardcoded numbers |
| `[ ]` | Admin contact details visible to employer | "Your concierge: Aishwarya · +65 8xxx xxxx · WhatsApp" — closes the loop in the other direction |

---

## Things explicitly NOT in plan

To prevent scope creep, things we've decided *not* to build (or to defer):

- Video calls (dropped 2026-04-24, replaced by chat-first)
- **Phone OTP via SMS / WhatsApp** (dropped 2026-04-27 — verification is admin-reviewed manual)
- **Third-party KYC vendor** (Sumsub / Onfido / ID Analyzer — dropped 2026-04-27)
- **Stripe / card processing** (dropped 2026-04-27 — PayNow + admin allocation instead)
- **Third-party agencies** (dropped 2026-04-27 — HelperHaven is the only EA-licensed entity in the model)
- **Automated MOM eService integration** (deferred 2026-04-27 — admin staff file MOM submissions externally and update IPA case state via admin UI; revisit if case volume justifies the integration build)
- Singpass / MyInfo OIDC (deferred — revisit at scale)
- In-person verification by HelperHaven staff (too expensive at MVP)
- Continuous biometric re-auth (overkill)
- Endorsement / past-employer verification of helper experiences (would muddy the trust boundary; reviews are the only verified social signal)
- Dark mode
- Native mobile apps (web-first; mobile via PWA)
- ~~Multi-language UI on day one~~ — *partly reversed 2026-04-27: the helper questionnaire IS multi-language (en / id / my). Rest of the UI stays English-only at MVP.*
- Listing-fee model for helpers (helpers pay nothing, ever)

If a stakeholder asks "can we add X" and X is on this list, the answer is "not in MVP — let's add it to a v2 list and revisit after 100 paying employers."
