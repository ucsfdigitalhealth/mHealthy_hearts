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
- `POST /api/symptoms/event` - Log a symptom event (requires JWT)
- `GET /api/symptoms/events` - Get all symptom events for the user; optional query params: `?symptom_key=fatigue&limit=50&offset=0` (requires JWT)
- `POST /api/symptoms/disclaimer-log` - Record that the safety disclaimer was shown; body: `{ "context": "login" | "section_entry" | "acute_symptom_modal" }` (requires JWT)
- `POST /api/symptoms/ema-enrollment` - Enroll in recurring EMA check-ins (requires JWT)

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
| `symptom_events` | Every symptom a patient logs (core event log) |
| `symptom_disclaimer_log` | IRB audit trail — every time the safety disclaimer was shown |
| `ema_enrollments` | Patient EMA enrollment preferences (frequency + multi-slot schedule) |
| `user_goals` | Legacy — not currently used |


---

## Symptom Tracking Feature

### Overview
Patients can log individual symptoms through a 4-screen flow:

1. **Screen 1 — How are you feeling?** — Select one symptom from 15 options. Acute cardiac symptoms (chest pain, fainted, irregular heartbeat, racing heart, lightheadedness) trigger a blocking safety modal requiring acknowledgment before continuing.
2. **Screen 2 — What were you doing?** — Multi-select activity context (sitting, walking, exercising, etc.)
3. **Screen 3 — When? How long?** — Datetime picker (no future times) + duration selector (1 min / 10 min / 1 hour / more than 1 hour). Submits to `POST /api/symptoms/event`.
4. **Screen 4 — Once or ongoing?** — For EMA-eligible symptoms only. Patient chooses "just this once" or "ongoing" and can set multiple recurring day/time check-in slots.

### Safety Disclaimer
The legally approved disclaimer _"In an emergency, call 911 first. This app does not contact your doctor or send help. Log your symptoms after you are safe."_ appears in three contexts, each silently logged to `symptom_disclaimer_log`:
- **Login screen** — visible banner on every login
- **Screen 1 entry** — non-blocking banner at the top
- **Acute symptom modal** — blocking modal requiring "I Understand" before proceeding

### Instruments
`backend/config/instruments.js` is the **single source of truth** for all validated instruments used in the study. It exports:
- `INSTRUMENTS` — all 11 instruments with exact question wording, response scales, scoring logic, and reverse-score flags
- `SYMPTOM_INSTRUMENT_MAP` — maps each EMA symptom key to its instrument key
- `EMA_ENROLLMENT_KEYS` — the 9 patient-enrollable symptom keys (stress excluded — uses a separate grant-required 4x/day scheduled protocol)

| Symptom | Instrument |
|---|---|
| Fatigue | PROMIS Fatigue 4a |
| Anxiety | PROMIS Anxiety 4a |
| Depression / mood changes | PROMIS Depression 4a |
| Sleep disturbance | PROMIS Sleep Disturbance 4a |
| Reduced exercise tolerance | PROMIS Physical Function 4a |
| Breathlessness with activity | mMRC Dyspnea Scale |
| Waking short of breath at night | Single-item PND |
| Leg swelling | Single-item self-report |
| Unintentional weight change | Single-item self-report |
| Stress | PSS-4 EMA (scheduled protocol only) |
| Hot flashes | HFRDIS (QoL section, separate flow) |

### EMA Enrollment — Schedule Format
The `schedule` field in `ema_enrollments` stores a JSON array of `{day_of_week, time}` pairs, supporting multiple day/time combinations:
```json
[
  {"day_of_week": 1, "time": "09:00"},
  {"day_of_week": 3, "time": "14:00"}
]
```
`day_of_week`: 0 = Sunday, 1 = Monday, … 6 = Saturday.

### Migrations to Run
Use `backend/migrations/full_migrate.sql` — it includes all tables including `symptom_events`, `symptom_disclaimer_log`, and `ema_enrollments`. No need to run the individual symptom migration files separately.

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

