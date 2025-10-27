const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");
const db = require("../../db.js");
require("dotenv").config();

// Callback route to handle the response from Omron's OAuth service
router.get("/", async (req, res) => {
  const { code, state } = req.query;
  console.log('Omron Callback - code:', code);
  console.log('Omron Callback - state:', state);
  
  if (!code) {
    return res.status(400).send('Authorization failed: No code provided.');
  }

  try {
    // Look up the user and PKCE verifier by state from database
    const [userRows] = await db.execute(
      'SELECT id, omron_pkce_verifier FROM user_auth_testing WHERE omron_oauth_state = ?',
      [state]
    );

    if (userRows.length === 0) {
      return res.status(400).send('Authorization failed: Invalid state.');
    }

    const userId = userRows[0].id;
    const code_verifier = userRows[0].omron_pkce_verifier;

    if (!code_verifier) {
      return res.status(400).send('Authorization failed: PKCE verifier not found.');
    }

    // Exchange code for tokens with Omron's token endpoint
    const basicAuth = Buffer.from(`${process.env.OMRON_CLIENT_ID}:${process.env.OMRON_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await axios.post('https://prd-oauth.ohiomron.com/prd/connect/token', qs.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.REDIRECT_URI,
      code_verifier: code_verifier,
      client_id: process.env.OMRON_CLIENT_ID,
      client_secret: process.env.OMRON_CLIENT_SECRET
    }), {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Store in DB and clear temporary PKCE data
    await db.execute(
      'UPDATE user_auth_testing SET omron_access_token = ?, omron_refresh_token = ?, omron_token_expires = ?, omron_pkce_verifier = NULL, omron_oauth_state = NULL WHERE id = ?',
      [access_token, refresh_token, expiresAt, userId]
    );

    console.log(`Omron connected for user ${userId}`);
    res.redirect(`/fetchdata?access_token=${access_token}`);
  } catch (error) {
    console.error('Omron callback error:', error.response?.data || error.message);
    res.status(500).send(`Authorization failed: ${error.message}`);
  }
});

module.exports = { router };