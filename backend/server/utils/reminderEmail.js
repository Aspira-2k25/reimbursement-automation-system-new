const pool = require('../config/database');
const StudentForm = require('../models/StudentForm');
const emailService = require('./emailService');
const he = require('he');

const audienceRoles = ['Student', 'Faculty', 'Coordinator'];
async function reminderRecipients(targetRoles) {
  const roles = targetRoles.length ? targetRoles : audienceRoles;
  if (!pool) throw new Error('Reminder recipient database unavailable');
  const { rows: staff } = await pool.query('SELECT email, role, is_active FROM staff');
  const staffEmails = new Set(staff.map(user => user.email?.trim().toLowerCase()));
  const recipients = staff.filter(user => user.is_active && roles.includes(user.role)).map(user => user.email);
  if (roles.includes('Student')) {
    const [applications, sessions] = await Promise.all([
      StudentForm.distinct('email'),
      pool.query("SELECT DISTINCT user_id AS email FROM refresh_tokens WHERE user_id LIKE '%@%' AND revoked_at IS NULL AND expires_at > NOW()"),
    ]);
    recipients.push(...[...applications, ...sessions.rows.map(row => row.email)]
      .filter(email => !staffEmails.has(email?.trim().toLowerCase())));
  }
  return [...new Set(recipients.filter(email => typeof email === 'string')
    .map(email => email.trim().toLowerCase()).filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
}

async function sendReminderEmails(recipients, announcement) {
  let sent = 0, failed = 0;
  const html = `<p>Dear user,</p><p>${he.encode(announcement.message).replace(/\n/g, '<br>')}</p><p>Sent by ${he.encode(announcement.updatedBy)} (${he.encode(announcement.updatedByRole)}).</p><p>Please visit your reimbursement dashboard for details.</p>`;
  for (let index = 0; index < recipients.length; index++) {
    // Pace individual deliveries instead of sending a bulk burst.
    if (index) await new Promise(resolve => setTimeout(resolve, 600));
    try {
      const result = await emailService.sendEmail(recipients[index], 'Reimbursement reminder', html);
      if (result.success) sent++; else failed++;
    } catch { failed++; }
  }
  return { sent, failed };
}
module.exports = { audienceRoles, reminderRecipients, sendReminderEmails };
