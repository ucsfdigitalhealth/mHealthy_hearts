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
Local dev requires MySQL running on port 8889 (MAMP) with database `mhearts`. With `DB_HOST` unset, `backend/db.js` falls back to the local MAMP socket automatically; set the `DB_*` env vars (see `backend/env.example`) to point at RDS. The server stays up even if the DB is unreachable (connection pool, lazy connect) so `/health` keeps returning 200.

### Infrastructure (AWS CDK)
```bash
cd infra && npm install       # install CDK dependencies
cd infra && npm run synth     # synthesize CloudFormation template (no AWS creds needed)
cd infra && npm run deploy    # deploy to AWS (requires AWS credentials)
```
Two stacks: `MheDatabaseStack` (VPC, RDS, secrets — protected data vault) and `MheServiceStack` (ECS Fargate, ALB, CloudFront — stateless compute). `cdk-nag` runs on every synth. See `infra/README` details in the root `README.md` Deployment section.

### Migrations (production RDS)
RDS is in an isolated subnet and not reachable locally, so `backend/scripts/migrate.js` runs as a one-off ECS task inside the VPC against `migrations/full_migrate_additive.sql` (idempotent, no `DROP`s).

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

### Two-tier layout (plus infra)
- `backend/` — Express.js REST API (Node.js), packaged as a Docker container for AWS deployment
- `frontend/` — React Native app (Expo, TypeScript)
- `infra/` — AWS CDK infrastructure-as-code (TypeScript): `MheDatabaseStack` (VPC + RDS + secrets, the protected data vault) and `MheServiceStack` (ECS Fargate + ALB + CloudFront, stateless compute)

### Backend structure
- `app.js` — Express entry point, mounts all route modules; CORS origin from `FRONTEND_URL`; exposes `GET /health` for load-balancer health checks
- `auth.js` — JWT auth routes (register, login, refresh, logout) and `verifyToken`/`verifyTokenOrRefresh` middleware; refresh-token cookie `secure` flag respects `NODE_ENV=production`
- `fitbit.js` — Fitbit OAuth PKCE flow + data endpoints (steps, sleep, heart rate, activity summary)
- `db.js` — MySQL **connection pool** (mysql2). Env-driven config (`DB_HOST/PORT/USER/PASSWORD/NAME/SSL/SSL_CA`) with verified TLS against the RDS CA bundle for production; **falls back to the local MAMP socket when `DB_HOST` is unset** so local dev is unchanged. Uses `createPool` (lazy connect) so a transient DB failure no longer crashes the process and `/health` stays green.
- `refreshTokenUtils.js` — JWT token generation and validation helpers
- `routes/` — Feature route modules: `bloodLipids.js`, `bloodSugar.js`, `bmi.js`, `diet.js`, `smoking.js`, `healthScores.js`, `omron/`
- `migrations/` — SQL migration files. `full_migrate.sql` (destructive, for fresh local DBs) and `full_migrate_additive.sql` (non-destructive, idempotent `CREATE TABLE IF NOT EXISTS` / no `DROP`s, for production RDS). Both enforce FKs + `NOT NULL` `user_id`; the legacy `user_goals` table is no longer created.
- `scripts/migrate.js` — One-off schema migration runner for RDS; runs `full_migrate_additive.sql` as a multi-statement query inside the VPC (ECS task), since RDS is not reachable from the local machine.
- `Dockerfile` / `.dockerignore` — Multi-stage Node 20 image (native bcrypt build, RDS CA bundle baked in, non-root `node` user)

### Frontend structure
- `App.tsx` — Root component with navigation and context providers
- `src/config/api.ts` — **Single source of truth for the backend API origin** (`API_ORIGIN`): `http://localhost:3000` in dev (`__DEV__`), the deployed CloudFront URL in standalone/prod builds. Every screen/hook/context imports this instead of hardcoding a URL.
- `src/context/AuthContext.tsx` — JWT auth state (login, register, token refresh)
- `src/context/FitbitAuthContext.tsx` — Fitbit OAuth connection state
- `src/hooks/` — Data-fetching hooks (`useSteps`, `useSleep`) with AsyncStorage caching (2-min TTL)
- `src/screens/` — App screens; `LeFlows/` subdirectory contains health assessment flows
- `src/components/` — Reusable UI components
- `src/utils/` — Date/timezone helpers, cache utilities

### API route mounting pattern
All routes mount under `/api/` in `app.js` (plus a top-level `GET /health`):
- `/health` — LB health check (no DB, no auth)
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

## Repo notes (read on demand)
Detailed, verified reference docs — not auto-loaded, read via Grep/Read when a ticket touches that area:
- `docs/notes/flows.md` — LE8 assessment step-routing (blood sugar, lipids, smoking, BMI)
- `docs/notes/scoring.md` — scoring functions, thresholds, DB tables per assessment
- `docs/notes/caching.md` — AsyncStorage cache keys, TTLs, read/write points

## Key conventions
- **Backend files**: camelCase filenames
- **Frontend components/screens**: PascalCase filenames
- **Database**: snake_case for tables and columns; UUID primary keys (CHAR(36)) for users; foreign keys with CASCADE delete
- **API URLs**: kebab-case segments
- **Environment variables**: stored in `backend/.env` (see `backend/env.example` for template). Local dev needs only `JWT_SECRET` + OAuth creds (leave `DB_HOST` unset for the MAMP socket fallback); production uses the full `DB_*` set, injected into the ECS task from Secrets Manager.
- **Frontend API origin**: single source of truth in `frontend/src/config/api.ts` (`API_ORIGIN`). Do not hardcode `http://localhost:3000` in screens/hooks/contexts — import `API_ORIGIN`. It resolves to localhost in dev (`__DEV__`) and the CloudFront URL in standalone/prod builds.
- **AWS resource names/descriptions**: hyphens, not em dashes (per global AWS guidance)

## Current state
- `main` is the active branch — PRs merge directly into it (`oauth2` is stale, last touched before the PR-based workflow started)
- The old goals feature (`GoalsSettingScreen.tsx`, `user_goals` table, `backend/routes/userGoals.mjs`) is dead code, not wired up anywhere. The `user_goals` table is no longer created by the migration files (only `DROP`'d in `full_migrate.sql` to clean up pre-existing copies). It has been replaced by a live step-goal flow: `frontend/src/screens/GoalFlow/*` (registered in `App.tsx`), backed by `backend/routes/activityGoals.js` (mounted at `/api/activity`), consumed via `frontend/src/hooks/useActivityGoal.ts`
- Omron integration is partially implemented (auth flow works, data fetching not yet implemented)
- AWS migration in progress (PR #19): backend is containerized and production-ready (Phase A), CDK infra defined and synthesizable (Phase B), additive migration + runner ready (Phase D), frontend API origin centralized (Phase G). Deploy (`cdk deploy`) and RDS migration execution are follow-ups requiring AWS credentials.
