/**
 * Counter Model
 *
 * Provides atomic, globally unique sequence numbers using MongoDB's
 * findOneAndUpdate with $inc.  Each document represents one counter,
 * keyed by _id (e.g. "global_app_id_2026").
 *
 * Usage:
 *   const { getNextSequence } = require('./Counter');
 *   const seq = await getNextSequence('global_app_id_2026');
 *   // seq is guaranteed unique and monotonically increasing
 */

const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // e.g. "global_app_id_2026"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

/**
 * Atomically increment and return the next sequence number for the
 * given counter key.
 *
 * - Uses `findOneAndUpdate` with `$inc` and `upsert` for atomicity.
 * - If the counter doesn't exist yet, it is created with seq = 1.
 * - Concurrent calls are serialized by MongoDB — no two callers can
 *   ever receive the same value.
 *
 * @param {string} key  Counter identifier (e.g. "global_app_id_2026")
 * @returns {Promise<number>}  The next sequence number (1, 2, 3, …)
 */
async function getNextSequence(key) {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

module.exports = { Counter, getNextSequence };
