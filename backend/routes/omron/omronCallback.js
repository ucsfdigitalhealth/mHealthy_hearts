import express from "express";
const router = express.Router();

import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import myDatabase from "../../db.js";

// Function to exchange the authorization code for an access token
async function getAccessToken(code) {
  try {
    const tokenResponse = await axios.post(
      "https://prd-oauth.ohiomron.com/prd/connect/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return tokenResponse.data; // Return the entire response data
  } catch (error) {
    throw new Error(
      `Error exchanging authorization code for token: ${error.message}`
    );
  }
}

// Callback route to handle the response from Omron's OAuth service
router.get("/", async (req, res) => {
  const code = req.query.code;
  //console.log(code);
  const userId = decodeURIComponent(req.query.state); // Decode and retrieve the user_id
  if (!code) {
    return res.status(400).send("Authorization code is missing.");
  }

  const re_userId = userId;
  console.log("This is the user ID: ", re_userId);
  const tokenData = await getAccessToken(code); // Get the entire token data
  console.log(tokenData);
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in;
  //console.log("Expires In:", expiresIn);
  const expiryTime = Date.now() + expiresIn * 1000; // Convert to milliseconds
  console.log("This is the expiry time: ", expiryTime);

  try {
    await myDatabase.pool.query(
      "INSERT INTO omronuser_tokens (user_id, access_token, refresh_token, expiry_time) VALUES (?, ?, ?, ?)",
      [re_userId, accessToken, refreshToken, expiryTime],
      function (err, result) {
        if (err) throw err;
        console.log("Number of records inserted: " + result.affectedRows);
      }
    );
  } catch (error) {
    // Handle any errors that occurred during password hashing or database insertion
    console.error("Error:", error);
  }
  res.redirect(`/fetchdata?access_token=${accessToken}`);
});

export default { router };