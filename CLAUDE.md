# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mHealthy Hearts is a cardiovascular health tracking mobile app. React Native (Expo) frontend communicates with a Node.js/Express backend backed by MySQL. Integrates with Fitbit and Omron via OAuth 2.0 PKCE for device health data. Implements "Life's Essential 8" health assessments (blood lipids, blood sugar, BMI, diet, smoking).

## Commands

### Backend
```bash
cd backend && npm install    # install dependencies
cd backend && npm start      # start Express server on 0.0.0.0:3000
```
Requires MySQL running on port 8889 (MAMP) with database `mhearts`. DB connection is configured in `backend/db.js` using a MAMP socket path.

### Frontend
```bash
cd frontend && npm install   # install dependencies
cd frontend && npm start     # start Expo dev server
cd frontend && npm run ios   # run on iOS simulator
cd frontend && npm run android  # run on Android emulator
```

### No test suite configured
Neither backend nor frontend have test commands set up.

## Architecture

### Two-tier layout
- `backend/` — Express.js REST API (Node.js)
- `frontend/` — React Native app (Expo, TypeScript)

### Backend structure
- `app.js` — Express entry point, mounts all route modules
- `auth.js` — JWT auth routes (register, login, refresh, logout) and `verifyToken`/`verifyTokenOrRefresh` middleware
- `fitbit.js` — Fitbit OAuth PKCE flow + data endpoints (steps, sleep, heart rate, activity summary)
- `db.js` — MySQL connection pool (mysql2, MAMP socket)
- `refreshTokenUtils.js` — JWT token generation and validation helpers
- `routes/` — Feature route modules: `bloodLipids.js`, `bloodSugar.js`, `bmi.js`, `diet.js`, `smoking.js`, `healthScores.js`, `omron/`
- `migrations/` — SQL migration files for table creation

### Frontend structure
- `App.tsx` — Root component with navigation and context providers
- `src/context/AuthContext.tsx` — JWT auth state (login, register, token refresh)
- `src/context/FitbitAuthContext.tsx` — Fitbit OAuth connection state
- `src/hooks/` — Data-fetching hooks (`useSteps`, `useSleep`) with AsyncStorage caching (2-min TTL)
- `src/screens/` — App screens; `LeFlows/` subdirectory contains health assessment flows
- `src/components/` — Reusable UI components
- `src/utils/` — Date/timezone helpers, cache utilities

### API route mounting pattern
All routes mount under `/api/` in `app.js`:
- `/api/auth/*` — auth.js
- `/api/fitbitAuth/*` — fitbit.js
- `/api/blood-lipids`, `/api/blood-sugar`, `/api/bmi`, `/api/diet`, `/api/smoking` — assessment routes
- `/api/health-scores` — aggregated scores
- `/api/omronAuth`, `/api/omronCallback` — Omron OAuth

### Authentication flow
JWT access tokens (60min) + refresh tokens (7 days, HTTP-only cookie). All protected endpoints use `verifyToken` middleware; `req.user.userId` provides the authenticated user ID. Frontend sends `Authorization: Bearer <token>` header.

### OAuth integration pattern (Fitbit/Omron)
1. Frontend calls backend connect endpoint (with JWT)
2. Backend generates PKCE challenge, stores verifier + state in DB, returns auth URL
3. Frontend opens browser; user authorizes
4. Callback exchanges code for tokens using stored PKCE verifier
5. Tokens stored in `user_auth_testing` table

### Data caching
- **Backend**: Fitbit data cached in `fitbit_daily_data` and `fitbit_sleep_data` tables to reduce API calls
- **Frontend**: AsyncStorage with 2-minute TTL for steps/sleep data; background refresh timers

### Timezone handling
Client timezone sent via `?timezone=` query param or `X-Timezone` header. Backend uses it to determine "today"/"yesterday" relative to user's location. Sleep data keyed by bed date in local timezone.

### Health scoring
Each assessment module has a scoring function (0-100 scale). Diet uses MEPA score (0-10) mapped to 0-100. Aggregate endpoint `/api/health-scores` returns all scores for the authenticated user.

## Key conventions
- **Backend files**: camelCase filenames
- **Frontend components/screens**: PascalCase filenames
- **Database**: snake_case for tables and columns; UUID primary keys (CHAR(36)) for users; foreign keys with CASCADE delete
- **API URLs**: kebab-case segments
- **Environment variables**: stored in `backend/.env` (see `backend/env.example` for template)
- API base URL is hardcoded as `http://localhost:3000` in frontend context files

## Current state
- Branch `oauth2` is the active development branch
- Goals feature (`user_goals`, `GoalsSettingScreen`) is disabled/commented out due to errors
- Omron integration is partially implemented (auth flow works, data fetching not yet implemented)
