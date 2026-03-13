const { Resend } = require('resend');
const he = require('he'); // HTML entity encoder for XSS prevention

// HTML sanitization helper
const sanitizeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return he.encode(String(str));
};

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || '');

/** Returns true if Resend is configured enough to attempt sending. */
const isSmtpConfigured = () => {
  return Boolean(process.env.RESEND_API_KEY);
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

  otpEmail: (otp) => ({
    subject: 'Your OTP for Password Change - Reimbursement System',
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
            <h2>Password Change OTP</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Your OTP for password change is:</p>
            
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

const sendEmail = async (to, subject, html) => {
  if (!isSmtpConfigured()) {
    console.warn('Email not sent: RESEND_API_KEY not set. Set it in Render env to enable email.');
    return { success: false, error: 'Resend not configured' };
  }
  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const { data, error } = await resend.emails.send({
      from: `Reimbursement System <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log('Email sent successfully:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Error sending email via Resend:', error.message || error);
    return { success: false, error: error.message };
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
const sendOtpEmail = async (email, otp) => {
  const template = emailTemplates.otpEmail(otp);
  return await sendEmail(email, template.subject, template.html);
};

module.exports = {
  sendEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendSubmissionEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  isSmtpConfigured,
};