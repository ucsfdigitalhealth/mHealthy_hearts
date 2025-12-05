const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../auth.js");
const db = require("../../db.js");
const axios = require("axios");
const qs = require("qs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Helper: Generate PKCE values
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { code_verifier: verifier, code_challenge: challenge };
}

// Helper: Generate secure state
function generateState(userId) {
  return crypto.randomBytes(32).toString('hex');
}

router.get("/", verifyToken, async (req, res) => {
  try {
    console.log('Omron Auth - req.user:', req.user);
    console.log('Omron Auth - userId:', req.user?.userId);
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Invalid token: userId not found' });
    }

    const { code_verifier, code_challenge } = generatePKCE();
    const state = generateState(req.user.userId);

    // Store PKCE verifier and state in database
    await db.execute(
      'UPDATE user_auth_testing SET omron_pkce_verifier = ?, omron_oauth_state = ? WHERE id = ?',
      [code_verifier, state, req.user.userId]
    );

    // Use the redirect URI from environment
    const authUrl = `https://prd-oauth-website.ohiomron.com/connect/authorize?` +
      qs.stringify({
        client_id: process.env.OMRON_CLIENT_ID,
        response_type: 'code',
        redirect_uri: process.env.REDIRECT_URI,
        scope: 'bloodpressure activity weight temperature oxygen openid offline_access',
        state: state,
        code_challenge: code_challenge,
        code_challenge_method: 'S256'
      }, { format: 'RFC1738' });

    console.log('Redirecting to Omron:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in omron auth:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ============================================================================
// DUMMY ENDPOINT - This is a dummy endpoint for testing purposes
// Reads the most recent n rows from the manual CSV data file
// This does NOT require OAuth2.0 authorization, but still requires user token
// ============================================================================
router.get("/dummy-data", verifyToken, async (req, res) => {
  try {
    // Verify user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Invalid token: userId not found' });
    }

    // Get the number of rows to return (default to 10 if not specified)
    const n = parseInt(req.query.n) || 10;
    
    // Validate n is a positive number
    if (isNaN(n) || n < 1) {
      return res.status(400).json({ message: 'Invalid parameter: n must be a positive integer' });
    }

    // Path to the CSV file
    const csvPath = path.join(__dirname, '../../data/omron_manual_data - Your Requested OMRON Report from Sep 01 2025 to Dec 02 2025.csv');
    
    // Read the CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    // Parse header row
    const headers = lines[0].split(',');
    
    // Parse data rows (skip header, take first n rows since data is sorted with most recent first)
    const dataRows = lines.slice(1, n + 1).map(line => {
      const values = line.split(',');
      return {
        date: values[0]?.trim(),
        time: values[1]?.trim(),
        systolic: values[2]?.trim(),
        diastolic: values[3]?.trim(),
        pulse: values[4]?.trim()
      };
    });

    // Return the data
    res.json({
      message: 'Dummy endpoint - returning manual CSV data',
      count: dataRows.length,
      requested: n,
      data: dataRows
    });
  } catch (error) {
    console.error('Error in dummy endpoint:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = { router };