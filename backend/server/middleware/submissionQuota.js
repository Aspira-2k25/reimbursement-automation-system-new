const Quota = require('../models/DailyQuota');
const StudentForm = require('../models/StudentForm');

module.exports = async (req, res, next) => {
  try {
    // Institutional day boundary, independent of the deployment host timezone.
    const offset = 330 * 60000;
    const day = new Date(Date.now() + offset).toISOString().slice(0, 10);
    const start = new Date(`${day}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 86400000);
    const userId = String(req.user.userId || req.user.email);
    const key = `${day}:${userId}`;
    const existing = await StudentForm.countDocuments({ userId, createdAt: { $gte: start, $lt: end } });
    await Quota.updateOne({ _id: key }, { $setOnInsert: { count: existing, expiresAt: new Date(end.getTime() + 86400000) } }, { upsert: true });
    const reservation = await Quota.findOneAndUpdate({ _id: key, count: { $lt: 3 } }, { $inc: { count: 1 } }, { new: true });
    if (!reservation) return res.status(429).json({ error: 'Daily submission limit reached', message: 'Maximum three student forms per institutional day.' });
    res.once('finish', () => {
      if (!req.submissionSaved) Quota.updateOne({ _id: key, count: { $gt: 0 } }, { $inc: { count: -1 } }).catch(error => console.error('Quota release failed:', error.message));
    });
    next();
  } catch (error) { next(error); }
};
