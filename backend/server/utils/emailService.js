const nodemailer = require('nodemailer');
const he = require('he'); // HTML entity encoder for XSS prevention

// HTML sanitization helper
const sanitizeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return he.encode(String(str));
};

//create transporter

const createTransporter = () => {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, ''); // Trim whitespace and strip surrounding quotes

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      // Always reject unauthorized certificates in production
      // Only allow insecure connections in development for testing
      rejectUnauthorized: process.env.NODE_ENV !== 'development'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
};

/** Returns true if SMTP is configured enough to attempt sending. */
const isSmtpConfigured = () => {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  return Boolean(user && pass);
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

};

// send email function 

const sendEmail = async (to, subject, html) => {
  if (!isSmtpConfigured()) {
    console.warn('Email not sent: SMTP_USER or SMTP_PASS not set. Set both in Render env to enable email.');
    return { success: false, error: 'SMTP not configured' };
  }
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Reimbursement System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Gmail SMTP from Render often fails (connection timeout): cloud IPs can be blocked by Google.
    // Use a transactional provider (SendGrid, Resend, Mailgun) for reliable delivery from production.
    console.error('Error sending email:', error.message || error);
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

module.exports = {
  sendEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendSubmissionEmail,
  isSmtpConfigured,
};