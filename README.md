# mHealthy Hearts

A health tracking application with user authentication and cardiovascular health monitoring.

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
   BASE_URL=http://localhost:3001
   FRONTEND_URL=http://localhost:19006
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
- `GET /api/auth/fitbit/connect` - Initiate Fitbit OAuth flow (requires JWT)
- `GET /api/auth/fitbit/callback` - Fitbit OAuth callback
- `POST /api/auth/fitbit/refresh` - Refresh Fitbit tokens (requires JWT)
- `GET /api/auth/fitbit/data` - Fetch Fitbit health data (requires JWT)

### Omron Integration
- `GET /api/omronAuth` - Initiate Omron OAuth flow with PKCE (requires JWT)
- `GET /api/omronCallback` - Omron OAuth callback (exchanges code for tokens)
- `GET /fetchdata` - Fetch data endpoint (temporary endpoint for testing)

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

Create the `user_auth_testing` table:
```sql
CREATE TABLE user_auth_testing (
  id VARCHAR(36) PRIMARY KEY DEFAULT (uuid()),
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refresh_token VARCHAR(255),
  refresh_token_expires DATETIME,
  fitbit_access_token TEXT,
  fitbit_refresh_token TEXT,
  fitbit_token_expires TIMESTAMP,
  fitbit_pkce_verifier VARCHAR(512),
  fitbit_oauth_state VARCHAR(128),
  omron_access_token TEXT,
  omron_refresh_token TEXT,
  omron_token_expires TIMESTAMP,
  omron_pkce_verifier VARCHAR(512),
  omron_oauth_state VARCHAR(128)
);
```

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

