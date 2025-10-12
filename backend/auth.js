// auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
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