// auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');  // For PKCE
const {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiration,
  isRefreshTokenExpired
} = require('./refreshTokenUtils');
require('dotenv').config();

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [rows, fields] = await db.execute('INSERT INTO user_auth_testing (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows, fields] = await db.execute('SELECT * FROM user_auth_testing WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }
    
    const user = rows[0];
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }
    
    // Generate access token (short-lived)
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    // Generate refresh token (long-lived)
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = await hashRefreshToken(refreshToken);
    const refreshTokenExpiration = getRefreshTokenExpiration(7); // 7 days
    
    // Store refresh token in database
    await db.execute(
      'UPDATE user_auth_testing SET refresh_token = ?, refresh_token_expires = ? WHERE id = ?',
      [hashedRefreshToken, refreshTokenExpiration, user.id]
    );
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Use secure cookies in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });
    
    res.json({ 
      accessToken,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token not provided' });
    }
    
    // Find user with this refresh token - no authentication required
    const [rows] = await db.execute(
      'SELECT * FROM user_auth_testing WHERE refresh_token IS NOT NULL'
    );
    
    let user = null;
    let validToken = false;
    
    // Check each user's refresh token
    for (const row of rows) {
      if (await verifyRefreshToken(refreshToken, row.refresh_token)) {
        user = row;
        validToken = true;
        break;
      }
    }
    
    if (!validToken || !user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Check if refresh token has expired
    if (isRefreshTokenExpired(user.refresh_token_expires)) {
      // Clear the expired refresh token
      await db.execute(
        'UPDATE user_auth_testing SET refresh_token = NULL, refresh_token_expires = NULL WHERE id = ?',
        [user.id]
      );
      res.clearCookie('refreshToken');
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    
    // Generate new access token
    const newAccessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    // Optionally rotate refresh token for enhanced security
    const newRefreshToken = generateRefreshToken();
    const hashedNewRefreshToken = await hashRefreshToken(newRefreshToken);
    const newRefreshTokenExpiration = getRefreshTokenExpiration(7);
    
    // Update database with new refresh token
    await db.execute(
      'UPDATE user_auth_testing SET refresh_token = ?, refresh_token_expires = ? WHERE id = ?',
      [hashedNewRefreshToken, newRefreshTokenExpiration, user.id]
    );
    
    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production, false for local development
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ 
      accessToken: newAccessToken,
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Find and invalidate the refresh token - no authentication required
      const [rows] = await db.execute(
        'SELECT * FROM user_auth_testing WHERE refresh_token IS NOT NULL'
      );
      
      // Check each user's refresh token to find the match
      for (const row of rows) {
        if (await verifyRefreshToken(refreshToken, row.refresh_token)) {
          await db.execute(
            'UPDATE user_auth_testing SET refresh_token = NULL, refresh_token_expires = NULL WHERE id = ?',
            [row.id]
          );
          break;
        }
      }
    }
    
    // Clear the refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }
  
  try {
    // Extract token from "Bearer <token>" format
    const tokenParts = token.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({ message: "Invalid token format" });
    }
    
    const decoded = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Access token expired",
        code: "TOKEN_EXPIRED"
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Invalid access token",
        code: "INVALID_TOKEN"
      });
    } else {
      return res.status(401).json({ 
        message: "Token verification failed",
        code: "TOKEN_VERIFICATION_FAILED"
      });
    }
  }
}

// Enhanced middleware that can handle both access tokens and refresh tokens
function verifyTokenOrRefresh(req, res, next) {
  const authHeader = req.header("Authorization");
  
  if (authHeader) {
    // Try to verify access token first
    try {
      const tokenParts = authHeader.split(" ");
      if (tokenParts.length === 2 && tokenParts[0] === "Bearer") {
        const decoded = jwt.verify(tokenParts[1], process.env.JWT_SECRET);
        req.user = decoded;
        return next();
      }
    } catch (error) {
      // If access token is expired, check for refresh token
      if (error.name === 'TokenExpiredError') {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
          return res.status(401).json({ 
            message: "Access token expired and no refresh token available",
            code: "TOKEN_EXPIRED_NO_REFRESH"
          });
        }
        
        // Let the client know they should refresh their token
        return res.status(401).json({ 
          message: "Access token expired, please refresh",
          code: "TOKEN_EXPIRED_REFRESH_AVAILABLE"
        });
      }
    }
  }
  
  return res.status(401).json({ message: "Authentication required" });
}

  // Protected Route to Get User Info
router.get('/userinfo', verifyToken, async (req, res) => {
    try {
      const userId = req.user.userId;
      const [rows, fields] = await db.execute('SELECT * FROM user_auth_testing WHERE id = ?', [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user: rows[0] });
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  module.exports = { router, verifyToken, verifyTokenOrRefresh };


// Helper: Generate PKCE values (from tutorial)
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');  // 43+ chars
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { code_verifier: verifier, code_challenge: challenge };
}

// Helper: Generate secure state
function generateState(userId) {
  return crypto.randomBytes(32).toString('hex');
}

// Route 1: Connect to Fitbit (protected; generates PKCE/state)
router.get('/fitbit/connect', verifyToken, (req, res) => {
  const { code_verifier, code_challenge } = generatePKCE();
  const state = generateState(req.user.userId);  // Include userId for verification

  // Store PKCE/state temporarily (e.g., in session or DB; for simplicity, pass via query/state)
  // In prod, use Redis/session store; here, encode in state (base64 JSON)
  const stateData = Buffer.from(JSON.stringify({ userId: req.user.userId, verifier: code_verifier })).toString('base64');
  const stateParam = crypto.createHash('sha256').update(stateData).digest('base64url');  // Secure state hash

  const scope = 'activity heartrate profile sleep';  // Tutorial example; match your app
  const authUrl = `https://www.fitbit.com/oauth2/authorize?` +
    qs.stringify({
      response_type: 'code',
      client_id: process.env.FITBIT_CLIENT_ID,
      redirect_uri: `${process.env.BASE_URL}/api/auth/fitbit/callback`,
      scope: scope,
      state: stateParam,
      code_challenge: code_challenge,
      code_challenge_method: 'S256'
    }, { format: 'RFC1738' });

  // Store full stateData in session (assume you have express-session; add if needed)
  // For now, we'll verify in callback via DB or temp store—expand as needed
  res.redirect(authUrl);
});

// Route 2: Callback (handles code/state; exchanges for tokens)
router.get('/fitbit/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).send('Authorization failed: No code provided.');
  }

  try {
    // Verify state (from tutorial: prevent CSRF)
    // In full impl, fetch stored stateData by hash; here, assume simple check (expand with session/DB)
    // For demo: Decode and validate userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());  // Adjust if using hash
    const { userId, code_verifier } = stateData;  // Retrieve verifier

    // Exchange code for tokens (server-side, per tutorial)
    const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await axios.post('https://api.fitbit.com/oauth2/token', qs.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.BASE_URL}/api/auth/fitbit/callback`,
      code_verifier: code_verifier  // PKCE verifier
    }), {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Store in DB
    await db.execute(
      'UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ? WHERE id = ?',
      [access_token, refresh_token, expiresAt, userId]
    );

    console.log(`Fitbit connected for user ${userId}; Granted scopes: ${scope}`);

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?fitbit=connected`);
  } catch (error) {
    console.error('Fitbit callback error:', error.response?.data || error.message);
    // Common fixes: Check redirect_uri mismatch, invalid code_verifier
    if (error.response?.data?.error === 'invalid_request') {
      console.log('Troubleshoot: Verify PKCE and params');
    }
    res.redirect(`${process.env.FRONTEND_URL}/error?msg=fitbit_failed&details=${encodeURIComponent(error.message)}`);
  }
});

// Route 3: Refresh Token (new; from tutorial)
router.post('/fitbit/refresh', verifyToken, async (req, res) => {
  try {
    const [userRows] = await db.execute('SELECT fitbit_refresh_token FROM user_auth_testing WHERE id = ?', [req.user.userId]);
    const { fitbit_refresh_token } = userRows[0];
    if (!fitbit_refresh_token) {
      return res.status(400).json({ message: 'No refresh token' });
    }

    const basicAuth = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64');
    const refreshResponse = await axios.post('https://api.fitbit.com/oauth2/token', qs.stringify({
      grant_type: 'refresh_token',
      refresh_token: fitbit_refresh_token
    }), {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = refreshResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    await db.execute(
      'UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ? WHERE id = ?',
      [access_token, refresh_token || fitbit_refresh_token, expiresAt, req.user.userId]  // Update refresh if rotated
    );

    res.json({ message: 'Token refreshed', access_token });
  } catch (error) {
    console.error('Refresh error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Refresh token invalid - reconnect' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});

// Route 4: Fetch Data (updated with expiry check + refresh call)
router.get('/fitbit/data', verifyToken, async (req, res) => {
  try {
    const [userRows] = await db.execute('SELECT fitbit_access_token, fitbit_refresh_token, fitbit_token_expires FROM user_auth_testing WHERE id = ?', [req.user.userId]);
    let { fitbit_access_token, fitbit_refresh_token, fitbit_token_expires } = userRows[0];

    if (!fitbit_access_token) {
      return res.status(400).json({ message: 'Fitbit not connected' });
    }

    // Check expiry (tutorial best practice)
    if (new Date() > new Date(fitbit_token_expires)) {
      // Auto-refresh
      const refreshRes = await axios.post('https://api.fitbit.com/oauth2/token', qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: fitbit_refresh_token
      }), {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const { access_token, refresh_token, expires_in } = refreshRes.data;
      fitbit_access_token = access_token;
      const newExpires = new Date(Date.now() + (expires_in * 1000));
      await db.execute('UPDATE user_auth_testing SET fitbit_access_token = ?, fitbit_refresh_token = ?, fitbit_token_expires = ? WHERE id = ?', [access_token, refresh_token || fitbit_refresh_token, newExpires, req.user.userId]);
    }

    // Fetch heart rate (tutorial endpoint example)
    const today = new Date().toISOString().split('T')[0];
    const dataResponse = await axios.get(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1sec.json`,
      { headers: { Authorization: `Bearer ${fitbit_access_token}` } }
    );

    const heartData = dataResponse.data['activities-heart-intraday'].dataset || [];
    const latestRate = heartData.length > 0 ? heartData[heartData.length - 1].value : null;

    res.json({
      message: 'Data fetched',
      latestHeartRate: latestRate,  // BPM
      dataset: heartData.slice(-10),  // Last 10 secs
      grantedScopes: dataResponse.data  // From token; verify access
    });
  } catch (error) {
    console.error('Data fetch error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      res.status(401).json({ message: 'Token invalid - reconnect or refresh' });  // Triggers re-auth
    } else if (error.response?.status === 403) {
      res.status(403).json({ message: 'Insufficient scopes - re-authorize with more permissions' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
});