/**
 * Token blacklist implementation using MongoDB for serverless compatibility.
 * Works across multiple serverless instances unlike in-memory Map.
 * 
 * For production with high traffic, consider Redis instead.
 */

const mongoose = require('mongoose');

// Token Blacklist Schema
const TokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
    // index is created by the TTL index below (line 30), not here
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-expire documents after expiresAt
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklist = mongoose.model('TokenBlacklist', TokenBlacklistSchema);

/**
 * Add a token to the blacklist.
 * @param {string} token - The raw JWT string
 * @param {number} expiresInSeconds - Seconds until the token naturally expires
 */
async function addToBlacklist(token, expiresInSeconds) {
  try {
    // Hash the token for storage (don't store raw tokens)
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await TokenBlacklist.findOneAndUpdate(
      { token: tokenHash },
      { token: tokenHash, expiresAt },
      { upsert: true, new: true }
    );

    return true;
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
    // Fail secure: if we can't blacklist, assume it's blacklisted
    return false;
  }
}

/**
 * Check if a token is blacklisted.
 * @param {string} token - The raw JWT string
 * @returns {boolean}
 */
async function isBlacklisted(token) {
  try {
    // Hash the token for lookup
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const entry = await TokenBlacklist.findOne({ token: tokenHash });

    if (!entry) return false;

    // Check if expired
    if (entry.expiresAt <= new Date()) {
      // Document will be auto-deleted by TTL, but clean up now
      await TokenBlacklist.deleteOne({ token: tokenHash });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    // Fail secure: if we can't check, assume it's blacklisted
    return true;
  }
}

/**
 * Clean up expired tokens (manual cleanup, though TTL should handle most)
 * Can be called periodically via a cron job if needed.
 */
async function cleanupExpiredTokens() {
  try {
    const result = await TokenBlacklist.deleteMany({
      expiresAt: { $lte: new Date() }
    });
    console.log(`Cleaned up ${result.deletedCount} expired blacklisted tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  cleanupExpiredTokens,
  TokenBlacklist
};
