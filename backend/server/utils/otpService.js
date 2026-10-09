const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendOtpEmail } = require('./emailService');
const EXPIRY_SECONDS = 300;
const COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function digest(email, purpose, target, otp) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(JSON.stringify([email, purpose, target || '', otp])).digest('hex');
}
async function transaction(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error) { if (error.code !== 'P2034' || attempt === 2) throw error; }
  }
}
async function issue({ email, purpose, targetUsername = null }) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const hash = digest(email, purpose, targetUsername, otp);
  const record = await transaction(async tx => {
    const previous = await tx.accountOtpChallenge.findUnique({ where: { email_purpose: { email, purpose } } });
    const wait = previous ? COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(previous.created_at).getTime()) / 1000) : 0;
    if (wait > 0) return { error: 'Please wait before requesting another code.', status: 429, retryAfter: wait };
    return tx.accountOtpChallenge.upsert({ where: { email_purpose: { email, purpose } },
      create: { email, purpose, otp: hash, target_username: targetUsername, expiry_time: new Date(Date.now() + EXPIRY_SECONDS * 1000) },
      update: { otp: hash, target_username: targetUsername, attempts: 0, created_at: new Date(), expiry_time: new Date(Date.now() + EXPIRY_SECONDS * 1000) } });
  });
  if (record.error) return record;
  let delivery;
  try { delivery = await sendOtpEmail(email, otp, purpose); }
  catch { delivery = { success: false, code: 'EMAIL_DELIVERY_FAILED', error: 'Email delivery is temporarily unavailable. Please retry.' }; }
  if (!delivery.success) {
    await prisma.accountOtpChallenge.deleteMany({ where: { id: record.id, otp: hash } });
    return { status: 503, code: delivery.code || 'EMAIL_DELIVERY_FAILED',
      error: delivery.code ? delivery.error : 'Email delivery failed. Ask your administrator to check the email service configuration.' };
  }
  return { message: 'OTP sent to your registered email address.', cooldownSeconds: COOLDOWN_SECONDS, expirySeconds: EXPIRY_SECONDS };
}

// Return errors instead of throwing so failed-attempt increments commit.
async function consume(tx, { email, purpose, targetUsername = null, otp }) {
  const record = await tx.accountOtpChallenge.findUnique({ where: { email_purpose: { email, purpose } } });
  if (!record || new Date(record.expiry_time).getTime() <= Date.now()) return { status: 400, error: 'OTP is missing or expired. Request a new code.' };
  if (record.attempts >= MAX_ATTEMPTS) return { status: 429, error: 'Too many incorrect codes. Request a new OTP after the resend cooldown.' };
  const supplied = digest(email, purpose, targetUsername, String(otp));
  const stored = Buffer.from(record.otp, 'hex'), expected = Buffer.from(supplied, 'hex');
  if (record.target_username !== targetUsername || stored.length !== expected.length || !crypto.timingSafeEqual(stored, expected)) {
    await tx.accountOtpChallenge.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { status: 400, error: 'Invalid OTP or changed username. Use the code requested for this action.' };
  }
  await tx.accountOtpChallenge.delete({ where: { id: record.id } });
  return null;
}
function failure(error, res) {
  if (['P2021', 'P2022'].includes(error.code)) return res.status(503).json({ code: 'DATABASE_MIGRATION_REQUIRED', error: 'Account verification is unavailable until the database migration is applied.' });
  console.error('Account verification unavailable:', error.code || error.name);
  return res.status(503).json({ error: 'Account verification service is unavailable. Please retry.' });
}
module.exports = { issue, consume, transaction, failure };
