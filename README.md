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
- `GET /api/auth/userinfo` - Get user info (requires JWT token)

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
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
