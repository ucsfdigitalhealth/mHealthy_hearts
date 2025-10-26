import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  const userId = req.query.user_id; // Capture the user_id from the query parameter
  const state = encodeURIComponent(userId); // URL-encode the user_id
  const expiryTime = Date.now() + 3600 * 1000; // Convert to milliseconds
  console.log("Current time: ", Date.now());
  console.log("Expiry Time", expiryTime);
  const currentTimePlusBuffer = Date.now() + 5 * 60 * 1000;
  console.log("currentTimePlusBuffer: ", currentTimePlusBuffer);

  const authUrl =
    `https://prd-oauth-website.ohiomron.com/connect/authorize?` +
    `client_id=${process.env.CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${process.env.REDIRECT_URI}&` +
    `scope=bloodpressure+activity+weight+temperature+oxygen+openid+offline_access&` +
    `state=${state}`; // Include user_id in state parameter
  res.redirect(authUrl);
});

export default { router };