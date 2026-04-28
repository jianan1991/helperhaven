# HelperHaven

Singapore marketplace matching employers with migrant domestic helpers from Indonesia, Myanmar, and the Philippines. Skills-first profiles (100-point budget across 5 fixed metrics), chat-based unlock with 48-hour auto-refund, contract-gated two-way reviews, shared leave calendar, and end-to-end MOM Work Permit concierge (including early-termination + in-SG transfer pool).

## Stack

- **Backend:** Java 21, Spring Boot 3.3, PostgreSQL 16, Redis, Flyway, JPA/Hibernate, Spring Security (JWT), AWS SDK v2 (S3-compatible)
- **Frontend (web):** React 18, Vite, TypeScript, Tailwind, React Query, React Router
- **Admin portal:** React 18, Vite, TypeScript, Tailwind
- **Object storage:** MinIO locally, S3 in AWS (same SDK)
- **Mail:** MailHog locally, SES in AWS
- **Payments:** Stripe
- **Deploy:** docker-compose (home) / ECS Fargate + RDS + ElastiCache + S3 (AWS ap-southeast-1)

## Project layout

```
helperhaven/
├── backend/            # Spring Boot service
├── frontend-web/       # Public web app (employers, helpers, agencies)
├── admin/              # Internal admin portal
├── infra/
│   └── docker-compose.yml
├── docs/
│   └── data-model.md   # ERD + schema notes
├── .env.example
├── dev.sh              # local dev convenience script
└── README.md
```

## Quick start (home dev)

Requires Docker Desktop (or docker engine) and docker compose v2.

```bash
./dev.sh up
```

Then:

| Service | URL |
|---|---|
| Web app | http://localhost:5173 |
| Admin portal | http://localhost:5174 |
| Backend hello | http://localhost:8080/api/hello |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| MinIO console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| MailHog | http://localhost:8025 |
| Postgres | `localhost:5432` (`helperhaven` / `helperhaven`) |

Common commands:

```bash
./dev.sh down           # stop everything
./dev.sh logs backend   # tail backend logs
./dev.sh psql           # open psql in the container
./dev.sh reset-db       # wipe + recreate DB volume (destructive)
```

## Backend development without Docker

```bash
cd backend
# start only data services
docker compose -f ../infra/docker-compose.yml up -d postgres redis minio mailhog
# run the app
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Flyway runs the baseline schema + seed data on first boot.

## Frontend development without Docker

```bash
cd frontend-web
npm install
npm run dev   # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8080`.

## Deploying to AWS (ap-southeast-1)

**Same Docker images, different config.** Production override swaps local emulation for managed services:

| Concern | Local | AWS (prod) |
|---|---|---|
| Postgres | `postgres` container | RDS Postgres Multi-AZ |
| Redis | `redis` container | ElastiCache Redis |
| Object storage | MinIO | S3 |
| Mail | MailHog | SES |
| SMS / OTP | console log | SNS or Twilio |
| Secrets | `.env` file | Secrets Manager / SSM |
| CDN | — | CloudFront |

Terraform modules live in `infra/terraform/` (to be added). CI/CD via GitHub Actions: build images → push to ECR → ECS blue/green deploy.

## Data model

See [`docs/data-model.md`](docs/data-model.md) for the ERD and per-entity notes. The schema lives in [`backend/src/main/resources/db/migration/`](backend/src/main/resources/db/migration/). Never edit existing migration files — add a new `V{n}__description.sql`.

## Architectural notes

- **Cloud-portable by design** — no AWS-specific calls in business logic. Storage, mail, and notifications are behind Spring interfaces so local MinIO/MailHog work identically to S3/SES.
- **Chat-based unlock with auto-refund** — employer spends 1 credit to open a private chat thread with a helper (chat packs: 5 for S$15, 15 for S$40, 50 for S$100). If the helper does not send a first reply within 48 h the credit auto-refunds (a scheduled sweep queries `idx_unlock_auto_refund_due`). Helpers don't pay. PII (phone numbers, WeChat IDs, etc.) is auto-redacted in messages until both sides tap "Share contact". Employers can manually refund any time before the helper replies.
- **Contract-gated reviews (two-way)** — only employers whose `permit_case.status >= CARD_ISSUED` can publish a review, enforced via `reviews.permit_case_id` FK + the `reviews_public_requires_contract` CHECK + a service-layer status check. Reviews carry stars + free text + flag-tag array + English-level enum + a 5-metric verified breakdown that displays alongside the helper's self-rating (catches inflation). Helpers can review employers symmetrically — fixes the under-served "which employer treats helpers well?" signal.
- **Shared leave calendar** — `leave_requests` table with `requested_by` enum (HELPER, EMPLOYER, SYSTEM). Four interaction patterns: helper requests time off → employer approves; employer marks "you're off" days → helper sees; weekly rest-day rule stored once per contract in `rest_day_rules`; SG public holidays pre-seeded in `sg_public_holidays` (admin refreshes annually). Balances tracked per contract-year in `leave_balances`.
- **Early-termination concierge + in-SG transfer pool** — terminations run through `termination_cases` with resolution ∈ {`TRANSFER_TO_NEW_EMPLOYER`, `REPATRIATION`, `HELPER_CANCELLED`}. On transfer, the helper's `helper_profiles.available_for_transfer` flips true and they resurface in match results with a "★ In SG · transfer ready" badge — they can start within 7 days (no IPA wait). Existing SG work history is preserved so reviews follow the helper across employers.
- **Anti-sybil** — layered: passport hash unique constraint, KYC provider (Sumsub/Onfido/ID Analyzer), liveness check, device fingerprint, IP reputation, signup velocity limits, agency sponsorship fast-track, admin review queue. See `helperhaven.sybil.*` config in `application.yml`.
- **Work Permit concierge** — `permit_cases` drives a state machine mirroring the MOM FDW eService flow (Docs → Submit → Interim → Bond/Insurance → IPA → Arrival → SIP → Medical → Biometrics → Card). Admin Kanban lives in the admin portal.

## Environment variables

Copy `.env.example` to `.env` and edit. The compose file reads from that file; the backend reads from env vars injected by compose (or directly from the environment in prod).

## Licence

Proprietary — (c) HelperHaven. All rights reserved.
