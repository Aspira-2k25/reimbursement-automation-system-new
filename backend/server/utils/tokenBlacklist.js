/**
 * Token blacklist implementation using MongoDB for serverless compatibility.
 * Works across multiple serverless instances unlike in-memory Map.
 * 
 * For production with high traffic, consider Redis instead.
 */

const mongoose = require('mongoose');
const connectMongoDB = require('../config/mongo');

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
    // NOTE: Do NOT add `index: true` here.
    // A single TTL index is created below to avoid duplicate index warnings.
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
    throw error;
  }
}

/**
 * Check if a token is blacklisted.
 * @param {string} token - The raw JWT string
 * @returns {boolean}
 */
async function isBlacklisted(token) {
  try {
    // Revocation checks must never succeed by treating an unavailable store as empty.
    if (mongoose.connection.readyState !== 1) {
      await connectMongoDB();
    }

    // Hash the token for lookup
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Use maxTimeMS to prevent blocking serverless execution
    const entry = await TokenBlacklist.findOne({ token: tokenHash }).maxTimeMS(2500);

    if (!entry) return false;

    // Check if expired
    if (entry.expiresAt <= new Date()) {
      // Document will be auto-deleted by TTL, but clean up now
      await TokenBlacklist.deleteOne({ token: tokenHash }).maxTimeMS(2500);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    throw error;
  }
}


module.exports = { addToBlacklist, isBlacklisted, TokenBlacklist };
