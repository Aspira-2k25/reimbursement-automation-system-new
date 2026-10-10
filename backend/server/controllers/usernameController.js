const prisma = require('../config/prisma');
const otpService = require('../utils/otpService');
const ROLES = new Set(['faculty', 'hod', 'coordinator', 'accounts', 'principal']);
function username(body) {
  if (typeof body?.username !== 'string') return null;
  const value = body.username.trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/.test(value) ? value : null;
}
async function account(req) {
  if (!ROLES.has(req.user?.role?.toLowerCase()) || !Number.isSafeInteger(Number(req.user?.userId)) || Number(req.user.userId) <= 0) return null;
  return prisma.staff.findUnique({ where: { id: Number(req.user.userId) }, select: { id: true, username: true, email: true, is_active: true } });
}
async function available(tx, value, id) {
  return !await tx.staff.findFirst({ where: { username: { equals: value, mode: 'insensitive' }, id: { not: id } }, select: { id: true } });
}
module.exports = {
  sendOtp: async (req, res) => {
    try {
      const staff = await account(req), value = username(req.body);
      if (!staff?.is_active) return res.status(403).json({ error: 'Username changes require an active staff account.' });
      if (!value) return res.status(400).json({ error: 'Use 3–100 letters, numbers, dots, underscores or hyphens; start with a letter or number.' });
      if (value === staff.username) return res.status(400).json({ error: 'Choose a different username.' });
      if (!await available(prisma, value, staff.id)) return res.status(409).json({ error: 'This username is already in use.' });
      const result = await otpService.issue({ email: staff.email, purpose: 'username', targetUsername: value });
      return res.status(result.status || 200).json(result);
    } catch (error) { return otpService.failure(error, res); }
  },
  change: async (req, res) => {
    try {
      const staff = await account(req), value = username(req.body);
      if (!staff?.is_active) return res.status(403).json({ error: 'Username changes require an active staff account.' });
      if (!value || !/^\d{6}$/.test(String(req.body?.otp || ''))) return res.status(400).json({ error: 'A valid username and six-digit OTP are required.' });
      const result = await otpService.transaction(async tx => {
        const current = await tx.staff.findUnique({ where: { id: staff.id }, select: { id: true, email: true, is_active: true } });
        if (!current?.is_active || current.email !== staff.email) return { status: 409, error: 'Account changed. Sign in and request a new code.' };
        if (!await available(tx, value, staff.id)) return { status: 409, error: 'This username is already in use.' };
        const error = await otpService.consume(tx, { email: staff.email, purpose: 'username', targetUsername: value, otp: req.body.otp });
        if (error) return error;
        const user = await tx.staff.update({ where: { id: staff.id }, data: { username: value },
          select: { id: true, username: true, name: true, email: true, role: true, department: true } });
        return { message: 'Username changed. Use the new username at your next sign-in.', user };
      });
      return res.status(result.status || 200).json(result);
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ error: 'This username is already in use.' });
      return otpService.failure(error, res);
    }
  }
};
