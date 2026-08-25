# mHealthy Hearts

A cardiovascular health tracking mobile app for prostate cancer survivors, monitoring cardiac and systemic symptoms as part of a clinical research study. Built with React Native (Expo) frontend, Node.js/Express backend, and MySQL.

The backend runs unchanged against a local MAMP MySQL for development, and is also packaged as a Docker container deployable to AWS (ECS Fargate + RDS, fronted by an Application Load Balancer and CloudFront). The AWS infrastructure is defined as code under `infra/` (AWS CDK). See [Deployment (AWS)](#deployment-aws) for the production setup.

## Prerequisites

- Node.js 20+ (the Docker image targets Node 20)
- MySQL server running on **port 8889** (MAMP) for local development
- Database named `mhearts` with table `user_auth_testing`
- Docker (only if building the container image / deploying to AWS)
- AWS CLI + AWS credentials (only for `cdk deploy`; `cdk synth` works without credentials)

## Setup

1. **Clone and install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the backend directory (see `backend/env.example` for the full template). For local dev, only `JWT_SECRET` and the OAuth credentials are required — **leave `DB_HOST` unset** and `backend/db.js` falls back to the local MAMP socket automatically:
   ```
   # ---- Auth ----
   JWT_SECRET=replace_with_openssl_rand_hex_32   # generate with: openssl rand -hex 32

   # ---- Database ----
   # Leave DB_HOST unset to use the local MAMP socket fallback (db.js).
   # Set all of the below when pointing at RDS / production.
   # DB_HOST=your-rds.cluster-xxxxx.region.rds.amazonaws.com
   # DB_PORT=3306
   # DB_USER=app_user
   # DB_PASSWORD=replace_with_strong_password
   # DB_NAME=mhearts
   # DB_SSL=true
   # DB_SSL_CA=/app/certs/global-bundle.pem

   # ---- App / runtime ----
   NODE_ENV=production        # production enables secure refresh-token cookies
   PORT=3000
   # FRONTEND_URL=https://your-domain.cloudfront.net   # CORS origin

   # ---- OAuth: Fitbit ----
   FITBIT_CLIENT_ID=your_fitbit_client_id
   FITBIT_CLIENT_SECRET=your_fitbit_client_secret

   # ---- OAuth: Omron ----
   OMRON_CLIENT_ID=your_omron_client_id_here
   OMRON_CLIENT_SECRET=your_omron_client_secret_here

   # Shared OAuth redirect base (update to the production HTTPS URL in prod)
   REDIRECT_URI=http://localhost:3000/api/omronCallback
   ```

3. **Start MySQL server** on port 8889

4. **Start the application:**
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend (in another terminal)
   cd frontend && npm start
   ```

## API Endpoints

### Health Check
- `GET /health` - Load balancer / container health check; returns `200 {"status":"ok"}` without touching the DB (used by the ALB target-group health check and ECS circuit breaker)

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/userinfo` - Get user info (requires JWT token)

### Fitbit Integration
- `GET /api/fitbitAuth/fitbit/connect` - Initiate Fitbit OAuth flow (requires JWT)
- `GET /api/fitbitAuth/fitbit/callback` - Fitbit OAuth callback
- `POST /api/fitbitAuth/fitbit/refresh` - Refresh Fitbit tokens (requires JWT)
- `GET /api/fitbitAuth/fitbit/data` - Fetch heart rate data (requires JWT)
- `GET /api/fitbitAuth/fitbit/steps` - Fetch steps data for last 7 days (requires JWT)
- `GET /api/fitbitAuth/fitbit/activitySummary` - Fetch activity and sleep summary for last 7 days including lightly active, fairly active, very active minutes, steps, total minutes asleep, time in bed, and sleep efficiency (requires JWT)

### Omron Integration
- `GET /api/omronAuth` - Initiate Omron OAuth flow with PKCE (requires JWT)
- `GET /api/omronCallback` - Omron OAuth callback (exchanges code for tokens)
- `GET /fetchdata` - Fetch data endpoint (temporary endpoint for testing)

### Health Assessments
- `POST /api/blood-lipids` - Store blood lipids assessment data (requires JWT)
- `POST /api/blood-sugar` - Store blood sugar assessment data (requires JWT)
- `POST /api/bmi` - Store BMI assessment data (requires JWT)
- `POST /api/diet` - Store diet assessment data (requires JWT)
- `POST /api/smoking` - Store smoking assessment data (requires JWT)
- `GET /api/health-scores` - Get all health scores (blood lipids, blood sugar, BMI, diet, smoking) for authenticated user (requires JWT)

### Activity Goals & Streaks
- `GET /api/activity/goal-today` - Get today's step goal (requires JWT)
- `POST /api/activity/goal` - Set today's step goal (requires JWT)
- `GET /api/activity/streak` - Get current + longest streak (requires JWT)
- `GET /api/activity/yesterday-steps` - Get yesterday's step count (requires JWT)

### Symptom Tracking
- `POST /api/symptoms/event` - Log a symptom event; accepts `intensity_score` (0–10), `weight_change_direction`, `weight_change_lbs` (requires JWT)
- `GET /api/symptoms/events` - Get all symptom events for the user; optional query params: `?symptom_key=fatigue&limit=50&offset=0` (requires JWT)
- `POST /api/symptoms/disclaimer-log` - Record that the safety disclaimer was shown; body: `{ "context": "login" | "section_entry" | "acute_symptom_modal" }` (requires JWT)
- `GET /api/symptoms/weekly-instrument-keys` - Get the set of symptom keys included in the combined weekly check-in (requires JWT)
- `GET /api/symptoms/weekly-plan` - Get the user's active combined weekly symptom-tracking plan, or `{ plan: null }` (requires JWT)
- `POST /api/symptoms/weekly-plan` - Create the user's combined weekly plan (first-time setup); body: `{ symptom_keys, day_of_week, time, notification_channel }` (requires JWT)
- `PUT /api/symptoms/weekly-plan` - Update the user's existing weekly plan (same body as POST) (requires JWT)
- `DELETE /api/symptoms/weekly-plan` - Deactivate the user's weekly plan (requires JWT)
- `POST /api/symptoms/instrument-response` - Store a completed weekly validated instrument (PROMIS, mMRC, HFRDIS); server computes and overrides T-score; optional `weekly_plan_id` links it to a combined check-in session (requires JWT)
- `POST /api/symptoms/ema-enrollment` - Enroll in recurring reminders for a momentary symptom; `schedule_type: "weekly_day_time"` (default, `schedule: [{day_of_week, time}, ...]`) or `"daily_times"` (`schedule: {times: [...]}`, plus `start_date`/`end_date`) (requires JWT)

### Request/Response Examples

**Register:**
```json
POST /api/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here"
}
```

## Database Schema

All tables are defined in the migration files under `backend/migrations/`. There are two variants of the full schema:

- **`full_migrate.sql`** — the destructive variant for a **fresh local database**. It `DROP`s every table and recreates them. Run it in MAMP phpMyAdmin by selecting the `mhearts` database, opening the SQL tab, pasting the file contents, and clicking Go. **This drops and recreates all tables — back up any data you need first.**
- **`full_migrate_additive.sql`** — the non-destructive, idempotent variant for **production (RDS)**. It uses `CREATE TABLE IF NOT EXISTS` and contains **no `DROP` statements**, so it is safe to re-run against a populated database: existing tables and data are left untouched and only missing tables are created. The schema (foreign keys, `NOT NULL` `user_id`s, no legacy `user_goals`) is kept in sync with `full_migrate.sql`.

Both variants now enforce referential integrity: every assessment/symptom table has a `FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE`, `user_id` columns are `NOT NULL`, and the circular `ema_enrollments` <-> `symptom_instrument_responses` foreign key is handled with `SET NULL` deletes. `SET FOREIGN_KEY_CHECKS` stays off through the `CREATE TABLE` block for that circular FK and is re-enabled at the end of each file.

### Running migrations against RDS

RDS lives in an isolated subnet and is not reachable from your local machine, so the additive migration is applied as a one-off ECS task inside the VPC via the runner `backend/scripts/migrate.js`. It sends the whole `full_migrate_additive.sql` as a single multi-statement query (`multipleStatements: true`) using the same `DB_*` env vars the app uses (injected from Secrets Manager), and prints a table / foreign-key count to CloudWatch as verification. It is **not** meant to be run locally.

The legacy `user_goals` table (replaced by the live `activity_goals` / `daily_goals` flow) is no longer created by either variant. `full_migrate.sql` retains a `DROP` for it to clean up pre-existing copies; the additive variant has no `DROP`s.

### Tables

| Table | Purpose |
|---|---|
| `user_auth_testing` | User accounts, JWT refresh tokens, Fitbit & Omron OAuth tokens |
| `fitbit_daily_data` | Activity data cached from Fitbit API (steps, active minutes, PA score) |
| `fitbit_sleep_data` | Sleep data cached from Fitbit API (minutes asleep, efficiency, sleep score) |
| `smoking_assessments` | LE8 smoking/nicotine assessment submissions |
| `blood_sugar_assessments` | LE8 blood glucose assessment submissions |
| `bmi_assessments` | LE8 BMI assessment submissions |
| `blood_lipids_assessments` | LE8 blood lipids assessment submissions |
| `diet_assessments` | LE8 diet assessment submissions (MEPA scoring) |
| `daily_scores` | Per-user per-day individual component scores (lightweight) |
| `composite_scores` | Per-user per-day overall composite score |
| `le8_composite_scores` | Full LE8 snapshot: all 8 component scores + aggregate per user per day |
| `daily_goals` | Step goals set each day through the daily check-in flow |
| `activity_streaks` | Running current and longest streak per user |
| `symptom_events` | Every symptom a patient logs; includes `intensity_score`, `weight_change_direction`, `weight_change_lbs` (v1.3) |
| `symptom_disclaimer_log` | IRB audit trail — every time the safety disclaimer was shown |
| `weekly_symptom_plans` | Single combined weekly check-in plan per user: up to 6 `symptom_keys`, one `day_of_week`/`time`/`notification_channel` reminder slot (v1.4) |
| `ema_enrollments` | Patient recurring-reminder preferences for momentary symptoms; `schedule_type` is `weekly_day_time` (multi-slot `{day_of_week, time}` schedule) or `daily_times` (`{times: [...]}` + `start_date`/`end_date`) (v1.3, extended v1.4) |
| `symptom_instrument_responses` | Completed weekly validated instrument results (raw score, T-score, severity label); `weekly_plan_id` links a response to its combined check-in session (v1.3, extended v1.4) |

> `user_goals` (legacy, replaced by the live `activity_goals` / `daily_goals` flow) is no longer created by the migration files. `full_migrate.sql` keeps a `DROP` to clean up pre-existing copies only.


---

## Symptom Tracking Feature (v1.4)

### Overview
Entering the Symptoms section always starts with a single safety disclaimer gate (`SymptomsDisclaimerGate`, logged to `symptom_disclaimer_log` with context `section_entry`). From there, `SymptomsLanding` offers two entry points:

- **Weekly symptom tracking** — one combined check-in covering all 7 validated weekly instruments (fatigue, anxiety, depression/mood, sleep disturbance, reduced exercise tolerance, breathlessness with activity, hot flashes), with a single shared weekly reminder slot (day/time + text or email). First-time setup: `WeeklySymptomSetup` (shows what's included — no per-symptom selection) → `WeeklyReminderSetup`. Once a plan exists, `SymptomsLanding` shows "Take this week's check-in now" plus Edit (`WeeklyReminderSetup`) and Delete affordances for the reminder schedule.
- **Track a symptom right now** (`SymptomsMomentaryList`) — log one of 8 momentary symptoms:
  - *Acute* (chest pain, fainted, irregular heartbeat, racing heart, light-headed/dizzy) — shows `AcuteSafetyModal` (911 reminder) before proceeding.
  - *Other* (waking SOB at night, leg swelling, unintentional weight change) — goes straight to the logging flow.

**Stress** has its own info card on `SymptomsLanding` (`StressInfoModal`) — stress check-ins are scheduled automatically; no manual logging or data written.

### Combined Weekly Check-in
"Take this week's check-in now" builds a queue of all instruments in the user's plan (`buildSymptomQueue`, from `weeklySymptomOptions.ts`) and steps through `SymptomsInstrument` one at a time, showing "N of total" progress and tagging each response with `weekly_plan_id`. After the last instrument, the user lands on `SymptomConfirmation` with `completedWeeklyCheckIn: true`.

### Momentary Symptom Flow
`SymptomScreen2` (activities) → `SymptomScreen3` (time/duration) → `SymptomsIntensity` (0–10 slider, or direction + lbs for weight change) → `SymptomRecurringPrompt`, asking whether to set up recurring reminders for that symptom:
- **"No, just this once"** → `POST /ema-enrollment` with `frequency: 'once'`.
- **"Yes"** → `DailyReminderSetup` (one or more daily times + a start/end date range) → `POST /ema-enrollment` with `schedule_type: 'daily_times'`.

Either branch ends at `SymptomConfirmation`. All 8 momentary symptoms (including the 5 acute ones) support recurring reminders via `EMA_ENROLLMENT_KEYS`; acute symptoms map to a generic `symptom_event_log` instrument key since they have no validated questionnaire.

### Screens
| Screen | Purpose |
|---|---|
| SymptomsDisclaimerGate | Single safety disclaimer gate shown on entering Symptoms; logs `section_entry` |
| SymptomsLanding | Two entry points (weekly check-in / track now), weekly plan summary + Edit/Delete, stress info link |
| WeeklySymptomSetup | First-time setup: shows the 7 auto-included weekly instruments before setting a reminder |
| WeeklyReminderSetup | Create/edit the single weekly reminder slot (day/time + text/email) for the combined check-in |
| SymptomsMomentaryList | Choose one of 8 momentary symptoms; acute ones show `AcuteSafetyModal` first |
| SymptomScreen2 — What were you doing? | Multi-select activity context |
| SymptomScreen3 — When? How long? | Datetime picker + duration selector |
| SymptomsIntensity | Intensity slider (0–10) for most symptoms; direction + lbs input for weight change |
| SymptomRecurringPrompt | Ask whether to set up recurring reminders for this momentary symptom |
| DailyReminderSetup | Daily-times schedule + start/end date range for recurring momentary reminders |
| SymptomsInstrument | Weekly validated questionnaire (PROMIS 4a, mMRC, or HFRDIS); stepped through as a queue for the combined check-in |
| SymptomConfirmation | Success screen; advances to the next queued instrument or shows a final summary |

### Safety Disclaimer
The approved disclaimer _"In an emergency, call 911. This app does not contact your doctor or send help. Log your symptoms after you are safe."_ appears in three contexts, each silently logged to `symptom_disclaimer_log`:
- **Login screen** — visible banner on every login
- **Symptoms section entry** — blocking modal on mount (must tap OK)
- **Acute symptom modal** — blocking modal requiring "I Understand" before proceeding

### Instruments
`backend/config/instruments.js` is the **single source of truth** for all validated instruments. It exports:
- `INSTRUMENTS` — all instruments with question wording, response scales, scoring logic, and reverse-score flags
- `SYMPTOM_INSTRUMENT_MAP` — maps each symptom key to its instrument key
- `EMA_ENROLLMENT_KEYS` — patient-enrollable symptom keys for recurring reminders (all 8 momentary symptoms; stress excluded — separate scheduled protocol)
- `WEEKLY_INSTRUMENT_KEYS` — the 7 symptom keys included in the combined weekly check-in
- `PROMIS_T_SCORES` + `lookupTScore()` — T-score lookup tables for all 5 PROMIS instruments

| Symptom | Instrument | Scoring |
|---|---|---|
| Fatigue | PROMIS Fatigue 4a | Sum → T-score lookup |
| Anxiety | PROMIS Anxiety 4a | Sum → T-score lookup |
| Depression / mood changes | PROMIS Depression 4a | Sum → T-score lookup |
| Sleep disturbance | PROMIS Sleep Disturbance 4a | Sum (items 0 & 1 reverse-scored) → T-score lookup |
| Reduced exercise tolerance | PROMIS Physical Function 4a | Sum → T-score lookup (higher = better) |
| Breathlessness with activity | mMRC Dyspnea Scale | Single grade 0–4; no T-score |
| Hot flashes | HFRDIS (10 items, 0–10 sliders) | Sum + average; mild / moderate / severe label |
| Chest pain, fainted, irregular heartbeat, racing heart, light-headed/dizzy | `symptom_event_log` (generic, no questionnaire) | Event log only |
| Waking short of breath at night | Single-item momentary log | — |
| Leg swelling | Single-item momentary log | — |
| Unintentional weight change | Direction + lbs input; clinical flag if >2 lbs gained same day | — |
| Stress | Informational modal only (scheduled protocol) | — |

### Schedule Formats
**Weekly check-in plan** (`weekly_symptom_plans`) — a single shared slot:
```json
{ "day_of_week": 1, "time": "09:00", "notification_channel": "text" }
```

**EMA enrollments** (`ema_enrollments`) — `schedule_type` determines the `schedule` shape:
- `weekly_day_time` (default) — array of `{day_of_week, time}` slots:
  ```json
  [
    {"day_of_week": 1, "time": "09:00"},
    {"day_of_week": 3, "time": "14:00"}
  ]
  ```
- `daily_times` — one or more daily reminder times plus a date range:
  ```json
  { "times": ["08:00", "20:00"] }
  ```
  with `start_date` (required) and optional `end_date` columns alongside.

`day_of_week`: 0 = Sunday … 6 = Saturday. `notification_channel` is `"text"` or `"email"`.

### Migrations to Run
Use `backend/migrations/full_migrate.sql` for a fresh database — it includes all tables through v1.4. For an existing database on pre-v1.3 schema, run `backend/migrations/add_intensity_columns_to_existing_db.sql` first (drops and recreates `symptom_events`, `ema_enrollments`, and `symptom_instrument_responses` with the v1.3 schema — **deletes existing rows in those three tables**), then run `backend/migrations/symptom_flow_v1_4_20260614.sql` to add `weekly_symptom_plans`, `ema_enrollments.schedule_type/start_date/end_date`, and `symptom_instrument_responses.weekly_plan_id`.

---

## Fitbit Integration Details

### Data Flow
- Frontend triggers `/api/fitbitAuth/fitbit/connect` → backend redirects to Fitbit authorization page
- Fitbit authenticates the user and redirects to `/api/fitbitAuth/fitbit/callback`
- Backend exchanges authorization code for access_token & refresh_token using PKCE
- Tokens are stored in the `user_auth_testing` table linked to the user
- PKCE verifier and OAuth state are temporarily stored during the flow for security

### Security Features
- PKCE (Proof Key for Code Exchange) flow for enhanced OAuth security
- State parameter for CSRF protection
- JWT authentication required to initiate the Fitbit OAuth flow
- Automatic token refresh using the `ensureValidAccessToken()` helper function

### Available Data Endpoints
- **Heart Rate**: `/api/fitbitAuth/fitbit/data` - Returns latest heart rate and intraday data
- **Steps**: `/api/fitbitAuth/fitbit/steps` - Returns 7 days of steps data
- **Activity Summary**: `/api/fitbitAuth/fitbit/activitySummary` - Returns 7 days of activity metrics including:
  - `minutesLightlyActive` - Light activity minutes
  - `minutesFairlyActive` - Fairly active minutes
  - `minutesVeryActive` - Very active minutes
  - `steps` - Total steps per day

## Omron Integration Details

### Data Flow
- Frontend triggers `/api/omronAuth` → backend redirects to Omron authorization page
- Omron authenticates the user and redirects to `/api/omronCallback`
- Backend exchanges authorization code for access_token & refresh_token using PKCE
- Tokens are stored in the `user_auth_testing` table linked to the user
- PKCE verifier and OAuth state are temporarily stored during the flow for security

### Security Features
- PKCE (Proof Key for Code Exchange) flow for enhanced OAuth security
- State parameter for CSRF protection
- JWT authentication required to initiate the Omron OAuth flow

### Future Work
- Implement automatic token refresh handling
- Implement `/api/fetchdata` to request real Omron device metrics
- Add endpoints for retrieving blood pressure, activity, weight, temperature, and oxygen data
- Add Notification system

---

## Frontend API Configuration

The backend API origin lives in a single source of truth: `frontend/src/config/api.ts`. Every screen, hook, and context imports `API_ORIGIN` from it instead of hardcoding `http://localhost:3000`.

```ts
export const API_ORIGIN = __DEV__
  ? 'http://localhost:3000'                       // Expo dev bundles -> local Express
  : 'https://d1ptdtremi31ja.cloudfront.net';      // standalone/prod builds -> deployed backend
```

`__DEV__` is a React Native global: `true` in `expo start` dev bundles, `false` in published/standalone builds, so the target flips automatically per build type. To point a physical device at your dev machine's LAN IP, or to test the prod backend from a dev build, change that one line.

---

## Deployment (AWS)

The backend is containerized and deployed to AWS using infrastructure-as-code under `infra/` (AWS CDK, TypeScript). The deployment follows a **data-vault** model: the data layer and the compute layer are split into separate CDK stacks so compute can be paused or destroyed freely without ever touching the database or secrets.

### Architecture

```
Mobile app (Expo)
   │  HTTPS
   ▼
CloudFront (HTTPS edge, *.cloudfront.net) ── HTTP ──► ALB (public subnet)
                                                        │  health check: GET /health
                                                        ▼
                                               ECS Fargate task (arm64, public subnet)
                                                  Express app in Docker
                                                        │  port 3306
                                                        ▼
                                                  RDS MySQL (isolated subnet)
```

### CDK stacks (`infra/`)

| Stack | Owns | Notes |
|---|---|---|
| `MheDatabaseStack` (`lib/database-stack.ts`) | VPC, RDS MySQL, all app secrets | The protected **data vault**. `terminationProtection` + RDS `deletionProtection` + `removalPolicy: SNAPSHOT` make destroying it a deliberate, multi-step act that still leaves a final snapshot. |
| `MheServiceStack` (`lib/service-stack.ts`) | ECR image, ECS Fargate service, ALB, CloudFront, IAM | Stateless compute. Holds **no data**, so it can be destroyed/paused freely while the database vault stays alive. Every app code change redeploys through here. |

**Networking** — One VPC, two AZs, no NAT gateway (cost: $0). Public subnets hold the ALB + Fargate tasks (tasks get a public IP for outbound calls to Fitbit/Omron). Private **isolated** subnets hold RDS, which has no route to the internet and is reachable only via a security-group ingress from the ECS tasks on port 3306.

**Compute** — The Express app is built from `backend/Dockerfile` (multi-stage Node 20 image: native bcrypt build, RDS CA bundle baked in, non-root `node` user) and pushed to ECR by CDK. It runs as a single 0.25 vCPU / 0.5 GB Fargate task on **arm64/Graviton** (matching the arm64 image and the Graviton RDS `t4g.micro`). The ECS circuit breaker rolls back a failed deploy quickly.

**Edge / HTTPS** — CloudFront terminates HTTPS on a free `*.cloudfront.net` URL (no custom domain needed) and forwards to the ALB over HTTP. Caching is disabled and all viewer headers/cookies/query are forwarded so `Authorization` + cookies reach the app. The ALB security group accepts traffic **only from the CloudFront prefix list**, so the ALB cannot be bypassed over plain HTTP.

**Secrets** — The RDS credentials are auto-generated into Secrets Manager. App secrets (`JWT_SECRET`, Fitbit/Omron client credentials, `REDIRECT_URI`, `BASE_URL`, `FRONTEND_URL`) live in the **data vault** stack so they survive a compute pause/destroy. `JWT_SECRET` is auto-generated; the OAuth credentials and the deploy-time URLs (`BASE_URL`/`FRONTEND_URL`, only known after the first deploy once the CloudFront domain exists) are created empty and filled in the Secrets Manager console after the first deploy. ECS injects every secret into the container as an env var via the task definition.

**Best practices** — `cdk-nag` (`AwsSolutionsChecks`) runs on every `cdk synth` and reports AWS Solutions violations as annotations. Intentional trade-offs for this 1-2 user research deployment (single-AZ RDS, no ALB/CloudFront access logging yet, no custom-domain TLS, default CloudFront certificate) are suppressed with documented, inline `acknowledge(...)` reasons; real gaps are fixed in code.

### Deploy workflow

```bash
cd infra && npm install

# Phase B: synthesize the CloudFormation template (works without AWS credentials)
npm run synth

# Phase C: deploy (requires AWS credentials; CDK_DEFAULT_ACCOUNT/REGION are injected by the CLI)
npm run deploy            # or: npx cdk deploy MheDatabaseStack MheServiceStack
```

After the first deploy:
1. Note the `CloudFrontUrl` stack output.
2. In the Secrets Manager console, fill the empty `BASE_URL` and `FRONTEND_URL` secrets with the CloudFront URL (and the frontend origin for CORS), plus the Fitbit/Omron client credentials and `REDIRECT_URI`.
3. Run the database migration as a one-off ECS task using `backend/scripts/migrate.js` (see [Running migrations against RDS](#running-migrations-against-rds)).
4. Redeploy the service stack so the tasks pick up the now-populated secrets, and update the Fitbit/Omron OAuth redirect URIs to the production HTTPS URLs.

### Local Docker build

```bash
cd backend && docker build -t mhe-backend .
docker run -p 3000:3000 --env-file .env mhe-backend
```

The image bakes in the RDS CA bundle (`/app/certs/global-bundle.pem`) and runs as the non-root `node` user. `.env` and `node_modules` are excluded via `backend/.dockerignore`.

