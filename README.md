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

Create the `fitbit_daily_data` table:
```sql
CREATE TABLE fitbit_daily_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,

  -- Activity
  steps INT,
  active_minutes INT,
  calories_burned INT,

  -- Sleep
  sleep_duration INT,
  sleep_efficiency INT,
  sleep_score INT,

  -- Timestamp that this data was retrieved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Create the `user_goals` table:
```sql
CREATE TABLE user_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  -- These goals should be according to goals set by user in GoalSetting or the like
  step_goal INT,
  sleep_goal INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Create the `blood_lipids_assessments` table:
```sql
CREATE TABLE blood_lipids_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  measure_type VARCHAR(64) NOT NULL,
  value DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
```

Create the `blood_sugar_assessments` table:
```sql
CREATE TABLE blood_sugar_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  test_type VARCHAR(64) NOT NULL,
  value DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

Create the `bmi_assessments` table:
```sql
CREATE TABLE bmi_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  bmi_value DECIMAL(5,2) NOT NULL,
  weight DECIMAL(6,2) NULL,
  height DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

Create the `diet_assessments` table:
```sql
CREATE TABLE diet_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  vegetables_per_day DECIMAL(4,2) NULL,
  fruit_per_day DECIMAL(4,2) NULL,
  red_meat_per_week DECIMAL(4,2) NULL,
  fish_per_week DECIMAL(4,2) NULL,
  butter_per_week DECIMAL(4,2) NULL,
  beans_per_week DECIMAL(4,2) NULL,
  whole_grains_per_day DECIMAL(4,2) NULL,
  sweets_per_week DECIMAL(4,2) NULL,
  fast_food_per_week DECIMAL(4,2) NULL,
  sugary_drinks_per_week DECIMAL(4,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

Create the `smoking_assessments` table:
```sql
CREATE TABLE smoking_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  category VARCHAR(20) NOT NULL,
  frequency VARCHAR(20) NULL,
  time_quit VARCHAR(20) NULL,
  interest_in_quitting VARCHAR(20) NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_category (category)
);
```

Create the `daily_goals` table:
```sql
CREATE TABLE IF NOT EXISTS daily_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  goal_date DATE NOT NULL,
  step_target INT NOT NULL,
  symptom_rating INT NULL,
  completed_yesterday TINYINT(1) NULL,
  goal_met TINYINT(1) NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_goal_date (user_id, goal_date),
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, goal_date)
);
```

Create the `activity_streaks` table:
```sql
CREATE TABLE IF NOT EXISTS activity_streaks (
  user_id INT NOT NULL PRIMARY KEY,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_goal_met_date DATE NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_auth_testing(id) ON DELETE CASCADE
);
```


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

