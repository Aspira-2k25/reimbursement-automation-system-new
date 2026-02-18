/**
 * In-memory token blacklist for logout support.
 * Tokens are stored with their expiry time and cleaned up periodically.
 * 
 * NOTE: This is per-instance. In a multi-instance serverless environment,
 * a shared store (Redis) would be needed for full coverage.
 */

const blacklistedTokens = new Map(); // token -> expiresAt (ms)

// Clean up expired tokens every 15 minutes to prevent memory growth
setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of blacklistedTokens) {
        if (expiresAt <= now) {
            blacklistedTokens.delete(token);
        }
    }
}, 15 * 60 * 1000).unref(); // .unref() so this doesn't keep the process alive

/**
 * Add a token to the blacklist.
 * @param {string} token - The raw JWT string
 * @param {number} expiresInSeconds - Seconds until the token naturally expires
 */
function addToBlacklist(token, expiresInSeconds) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    blacklistedTokens.set(token, expiresAt);
}

/**
 * Check if a token is blacklisted.
 * @param {string} token - The raw JWT string
 * @returns {boolean}
 */
function isBlacklisted(token) {
    if (!blacklistedTokens.has(token)) return false;

    // Also clean up if expired
    const expiresAt = blacklistedTokens.get(token);
    if (expiresAt <= Date.now()) {
        blacklistedTokens.delete(token);
        return false;
    }
    return true;
}

module.exports = { addToBlacklist, isBlacklisted };
