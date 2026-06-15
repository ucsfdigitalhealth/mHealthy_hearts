# mHealthy Hearts

A cardiovascular health tracking mobile app for prostate cancer survivors, monitoring cardiac and systemic symptoms as part of a clinical research study. Built with React Native (Expo) frontend, Node.js/Express backend, and MySQL (MAMP).

## Prerequisites

- Node.js
- MySQL server running on **port 8889**
- Database named `mhearts` with table `user_auth_testing`

## Setup

1. **Clone and install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment variables:**
   Create `.env` file in backend directory:
   ```
   JWT_SECRET=your_secret_key_here
   FITBIT_CLIENT_ID=your_fitbit_client_id
   FITBIT_CLIENT_SECRET=your_fitbit_client_secret
   BASE_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:8081
   OMRON_CLIENT_ID=your_omron_client_id_here
   OMRON_CLIENT_SECRET=your_omron_client_secret_here
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

All tables are defined in a single migration file:

```
backend/migrations/full_migrate.sql
```

Run it in MAMP phpMyAdmin by selecting the `mhearts` database, opening the SQL tab, pasting the file contents, and clicking Go. **This drops and recreates all tables — back up any data you need first.**

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
| `user_goals` | Legacy — not currently used |


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

