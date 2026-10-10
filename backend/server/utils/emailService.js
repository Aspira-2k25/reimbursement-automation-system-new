const { Resend } = require('resend');
const he = require('he'); // HTML entity encoder for XSS prevention

// HTML sanitization helper
const sanitizeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return he.encode(String(str));
};

const getConfigurationError = () => {
  const key = process.env.RESEND_API_KEY || '';
  const from = process.env.RESEND_FROM_EMAIL || '';
  if (!key || !from || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) return 'EMAIL_NOT_CONFIGURED';
  if (!/^re_[A-Za-z0-9_-]+$/.test(key)) return 'EMAIL_INVALID_KEY';
  return null;
};

/** Returns true if Resend is configured enough to attempt sending. */
const isSmtpConfigured = () => {
  return !getConfigurationError();
};

//email template

const emailTemplates = {
  approved: (formData, phase) => ({
    subject: `Reimbursement Application Approved - ${sanitizeHtml(formData.applicationId)}`,
    html: `
        <!DOCTYPE html>
        <html>
        <head>
        <style>
        body { font-family: Arial, sans-serif; line-height:1.6; color:#333; }
        .container {max-width:600px; margin:0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
          .status-badge { display: inline-block; padding: 5px 15px; background-color: #10b981; color: white; border-radius: 20px; font-weight: bold; }
          .details { margin: 20px 0; }
          .detail-row { margin: 10px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
          </head>
          <body>
          <div class="container">
          <div class="header">
          <h2>Application Approved</h2>
          </div>
          <div class="content">
            <p>Dear ${sanitizeHtml(formData.name)},</p>
            <p>Your reimbursement application has been <span class="status-badge">APPROVED</span> at the ${sanitizeHtml(phase)} phase.</p>

            <div class="details">
              <div class="detail-row"><strong>Application ID:</strong> ${sanitizeHtml(formData.applicationId)}</div>
              <div class="detail-row"><strong>Student ID:</strong> ${sanitizeHtml(formData.studentId)}</div>
              <div class="detail-row"><strong>Amount:</strong> ₹${sanitizeHtml(formData.amount) || 'N/A'}</div>
              <div class="detail-row"><strong>Current Status:</strong> ${sanitizeHtml(formData.status)}</div>
              ${formData.remarks ? `<div class="detail-row"><strong>Remarks:</strong> ${sanitizeHtml(formData.remarks)}</div>` : ''}
            </div>

            <p>Your application will proceed to the next phase of review.</p>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>Reimbursement Automation System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
        `,
  }),

  rejected: (formData, phase, remarks) => ({
    subject: `Reimbursement Application Rejected - ${sanitizeHtml(formData.applicationId)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
          .status-badge { display: inline-block; padding: 5px 15px; background-color: #ef4444; color: white; border-radius: 20px; font-weight: bold; }
          .details { margin: 20px 0; }
          .detail-row { margin: 10px 0; }
          .remarks-box { background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Application Rejected</h2>
          </div>
          <div class="content">
            <p>Dear ${sanitizeHtml(formData.name)},</p>
            <p>We regret to inform you that your reimbursement application has been <span class="status-badge">REJECTED</span> at the ${sanitizeHtml(phase)} phase.</p>

            <div class="details">
              <div class="detail-row"><strong>Application ID:</strong> ${sanitizeHtml(formData.applicationId)}</div>
              <div class="detail-row"><strong>Student ID:</strong> ${sanitizeHtml(formData.studentId)}</div>
              <div class="detail-row"><strong>Amount:</strong> ₹${sanitizeHtml(formData.amount) || 'N/A'}</div>
              <div class="detail-row"><strong>Status:</strong> ${sanitizeHtml(formData.status)}</div>
            </div>

            ${remarks ? `
              <div class="remarks-box">
                <strong>Reason for Rejection:</strong>
                <p>${sanitizeHtml(remarks)}</p>
              </div>
            ` : ''}
            <p>If you have any questions or concerns, please contact your coordinator.</p>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>Reimbursement Automation System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  reimbursed: (formData) => ({
    subject: `Reimbursement Disbursed - ${sanitizeHtml(formData.applicationId)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0f766e; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f0fdfa; padding: 20px; border-radius: 0 0 5px 5px; }
          .status-badge { display: inline-block; padding: 5px 15px; background-color: #0f766e; color: white; border-radius: 20px; font-weight: bold; }
          .details { margin: 20px 0; }
          .detail-row { margin: 10px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Reimbursement Completed</h2>
          </div>
          <div class="content">
            <p>Dear ${sanitizeHtml(formData.name)},</p>
            <p>Your reimbursement application has been <span class="status-badge">REIMBURSED</span> by the Accounts department.</p>

            <div class="details">
              <div class="detail-row"><strong>Application ID:</strong> ${sanitizeHtml(formData.applicationId)}</div>
              <div class="detail-row"><strong>Student ID:</strong> ${sanitizeHtml(formData.studentId)}</div>
              <div class="detail-row"><strong>Amount:</strong> ₹${sanitizeHtml(formData.amount) || 'N/A'}</div>
              <div class="detail-row"><strong>Current Status:</strong> ${sanitizeHtml(formData.status || 'Reimbursed')}</div>
              ${formData.remarks ? `<div class="detail-row"><strong>Accounts Remarks:</strong> ${sanitizeHtml(formData.remarks)}</div>` : ''}
            </div>

            <p>Congratulations on the successful reimbursement!</p>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>Reimbursement Automation System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  submission: (formData) => ({
    subject: `Reimbursement Application Submitted - ${sanitizeHtml(formData.applicationId)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
          .status-badge { display: inline-block; padding: 5px 15px; background-color: #3b82f6; color: white; border-radius: 20px; font-weight: bold; }
          .details { margin: 20px 0; }
          .detail-row { margin: 10px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Application Submitted</h2>
          </div>
          <div class="content">
            <p>Dear ${sanitizeHtml(formData.name)},</p>
            <p>Your reimbursement application has been <span class="status-badge">SUBMITTED</span> successfully.</p>

            <div class="details">
              <div class="detail-row"><strong>Application ID:</strong> ${sanitizeHtml(formData.applicationId)}</div>
              <div class="detail-row"><strong>Student ID:</strong> ${sanitizeHtml(formData.studentId)}</div>
              <div class="detail-row"><strong>Amount:</strong> ₹${sanitizeHtml(formData.amount) || 'N/A'}</div>
              <div class="detail-row"><strong>Status:</strong> Pending</div>
            </div>

            <p>Your application is now under review by the initial coordinator.</p>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>Reimbursement Automation System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordReset: (resetLink) => ({
    subject: 'Password Reset Request - Reimbursement System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B945E; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
          .btn { display: inline-block; padding: 12px 30px; background-color: #3B945E; color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .link-text { word-break: break-all; font-size: 12px; color: #666; }
          .warning { background-color: #fef3cd; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; font-size: 13px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for the Reimbursement System. Click the button below to set a new password:</p>

            <div style="text-align: center;">
              <a href="${sanitizeHtml(resetLink)}" class="btn">Reset Password</a>
            </div>

            <p class="link-text">If the button doesn't work, copy and paste this link into your browser:<br>${sanitizeHtml(resetLink)}</p>

            <div class="warning">
              <strong>⚠️ This link expires in 15 minutes.</strong> If you didn't request a password reset, you can safely ignore this email.
            </div>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>Reimbursement Automation System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  otpEmail: (otp, purpose = 'password') => ({
    subject: `Your OTP for ${purpose === 'username' ? 'Username' : 'Password'} Change - Reimbursement System`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B945E; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
          .otp-box { background-color: #ecfdf5; border: 2px dashed #3B945E; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #3B945E; letter-spacing: 8px; }
          .warning { background-color: #fef3cd; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; font-size: 13px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${purpose === 'username' ? 'Username' : 'Password'} Change OTP</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your OTP for ${purpose === 'username' ? 'username' : 'password'} change is:</p>

            <div class="otp-box">
              <div class="otp-code">${sanitizeHtml(otp)}</div>
            </div>

            <div class="warning">
              <strong>⚠️ This OTP is valid for 5 minutes.</strong> Do not share this code with anyone.
            </div>

            <p>If you didn't request this OTP, please secure your account immediately.</p>

            <div class="footer">
              <p>This is an automated notification. Please do not reply to this email.</p>
              <p>Reimbursement Automation System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

};

// send email function

const emailErrors = {
  EMAIL_NOT_CONFIGURED: 'Email service is not configured. Contact the administrator.',
  EMAIL_INVALID_KEY: 'Email credentials are invalid. Contact the administrator.',
  EMAIL_SENDER_UNVERIFIED: 'Email sender is not verified. Contact the administrator.',
  EMAIL_RATE_LIMITED: 'Email service is temporarily rate limited. Please try again later.',
  EMAIL_DELIVERY_FAILED: 'Email could not be sent. Please try again later.',
};
const failure = code => ({ success: false, code, error: emailErrors[code] });
const providerErrorCode = error => {
  const name = String(error?.name || '');
  const message = String(error?.message || '');
  if (name === 'invalid_api_key' || /api key.*invalid|invalid.*api key/i.test(message)) return 'EMAIL_INVALID_KEY';
  if (name === 'rate_limit_exceeded' || Number(error?.statusCode) === 429) return 'EMAIL_RATE_LIMITED';
  if (/domain.*not verified|verify.*domain|sender.*not verified|testing emails.*own email/i.test(message)) return 'EMAIL_SENDER_UNVERIFIED';
  return 'EMAIL_DELIVERY_FAILED';
};
const sendEmail = async (to, subject, html) => {
  const configurationError = getConfigurationError();
  if (configurationError) {
    console.warn('Email delivery blocked:', configurationError);
    return failure(configurationError);
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'Reimbursement System <' + process.env.RESEND_FROM_EMAIL + '>',
      to: [to], subject, html,
    });
    if (error) {
      const code = providerErrorCode(error);
      // Canonical reason/status only: provider messages can contain credentials or email content.
      console.error('Resend delivery rejected:', code, Number(error.statusCode) || 'unknown status');
      return failure(code);
    }
    if (!data?.id) {
      console.error('Resend delivery failed: provider returned no message ID');
      return failure('EMAIL_DELIVERY_FAILED');
    }
    return { success: true, messageId: data.id };
  } catch (error) {
    const code = providerErrorCode(error);
    console.error('Resend delivery failed:', code);
    return failure(code);
  }
};

//send approval email
const sendApprovalEmail = async (formData, phase) => {
  const template = emailTemplates.approved(formData, phase);
  return await sendEmail(formData.email, template.subject, template.html);
};

//send rejection email
const sendRejectionEmail = async (formData, phase, remarks) => {
  const template = emailTemplates.rejected(formData, phase, remarks);
  return await sendEmail(formData.email, template.subject, template.html);

};

//send reimbursed email
const sendReimbursedEmail = async (formData) => {
  const template = emailTemplates.reimbursed(formData);
  return await sendEmail(formData.email, template.subject, template.html);
};

//send submission email
const sendSubmissionEmail = async (formData) => {
  const template = emailTemplates.submission(formData);
  return await sendEmail(formData.email, template.subject, template.html);
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetLink) => {
  const template = emailTemplates.passwordReset(resetLink);
  return await sendEmail(email, template.subject, template.html);
};

// Send OTP email
const sendOtpEmail = async (email, otp, purpose = 'password') => {
  const template = emailTemplates.otpEmail(otp, purpose);
  return await sendEmail(email, template.subject, template.html);
};

module.exports = {
  sendEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendReimbursedEmail,
  sendSubmissionEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  isSmtpConfigured,
};
