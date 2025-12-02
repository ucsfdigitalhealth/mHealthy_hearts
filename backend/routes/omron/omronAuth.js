const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../auth.js");
const db = require("../../db.js");
const axios = require("axios");
const qs = require("qs");
const crypto = require("crypto");

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

module.exports = { router };