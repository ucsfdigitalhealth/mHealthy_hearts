// refreshTokenUtils.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Generate a secure random refresh token
 * @returns {string} A cryptographically secure random token
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash a refresh token for secure storage
 * @param {string} token - The plain refresh token
 * @returns {Promise<string>} The hashed token
 */
async function hashRefreshToken(token) {
  return await bcrypt.hash(token, 10);
}

/**
 * Verify a refresh token against its hash
 * @param {string} token - The plain refresh token
 * @param {string} hash - The stored hash
 * @returns {Promise<boolean>} Whether the token matches
 */
async function verifyRefreshToken(token, hash) {
  return await bcrypt.compare(token, hash);
}

/**
 * Calculate refresh token expiration date
 * @param {number} days - Number of days until expiration (default: 7)
 * @returns {Date} The expiration date
 */
function getRefreshTokenExpiration(days = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
}

/**
 * Check if a refresh token has expired
 * @param {Date} expirationDate - The token's expiration date
 * @returns {boolean} Whether the token has expired
 */
function isRefreshTokenExpired(expirationDate) {
  return new Date() > new Date(expirationDate);
}

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiration,
  isRefreshTokenExpired
};
