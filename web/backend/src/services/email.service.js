const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: (process.env.EMAIL_PASS || '').replace(/\s/g, ''),
      },
    });
  }

  getEmailTemplate(content, title = 'ExamSlot') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background-color: #000000; color: #ffffff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">ExamSlot</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">Self-Service Exam Date Sheet</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            ${content}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              This is an automated message from ExamSlot.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOTP(email, otp, name) {
    const displayName = name || 'there';
    const fromAddress = process.env.EMAIL_USER;

    const text = [
      `Hi ${displayName},`,
      '',
      'Your ExamSlot verification code is:',
      otp,
      '',
      'This code expires in 10 minutes.',
      'If you did not request this, you can ignore this email.',
      '',
      `Sent by ExamSlot <${fromAddress}>`,
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222;">
        <p style="margin:0 0 16px;">Hi ${displayName},</p>
        <p style="margin:0 0 16px;">Your ExamSlot verification code is:</p>
        <p style="margin:0 0 16px;font-size:28px;font-weight:bold;letter-spacing:6px;">${otp}</p>
        <p style="margin:0 0 16px;">This code expires in 10 minutes.</p>
        <p style="margin:0;color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"ExamSlot" <${fromAddress}>`,
      to: email,
      replyTo: fromAddress,
      subject: `${otp} is your ExamSlot verification code`,
      text,
      html,
      headers: { 'X-Entity-Ref-ID': `${Date.now()}` },
    };

    const info = await this.transporter.sendMail(mailOptions);
    console.log(`[Email] OTP sent to ${email} messageId=${info.messageId}`);
    return info;
  }

  async sendPasswordSetup(email, name, setupLink) {
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">Set Up Your Account</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name || 'Student'},</p>
      
      <div style="background-color: #d1edff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
        <p style="color: #004085; margin: 0; line-height: 1.6;">
          Your ExamSlot account has been created by an administrator. Please click the button below to set up your password and activate your account.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${setupLink}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Set Up Password
        </a>
      </div>

      <p style="color: #555; line-height: 1.6;">
        This link is single-use and expires in <strong>24 hours</strong>.
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.6;">
        If you did not expect this email, please ignore it. If you cannot click the button, copy and paste this URL into your browser:<br>
        <span style="word-break: break-all; color: #0066cc;">${setupLink}</span>
      </p>
    `;

    const mailOptions = {
      from: `"ExamSlot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Set Up Your ExamSlot Account',
      html: this.getEmailTemplate(content, 'Set Up Your ExamSlot Account'),
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendRequestStatus(email, name, requestType, status, remark) {
    const typeLabel = requestType === 'CHANGE_BRANCH' ? 'Branch Change' : 'Date Sheet Change';
    const statusColor = status === 'APPROVED' ? '#28a745' : '#dc3545';
    const statusBg = status === 'APPROVED' ? '#d4edda' : '#f8d7da';
    const statusTextColor = status === 'APPROVED' ? '#155724' : '#721c24';

    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name || 'Student'},</p>
      
      <div style="background-color: ${statusBg}; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0;">
        <p style="color: ${statusTextColor}; margin: 0; line-height: 1.6; font-weight: bold;">
          Your <strong>${typeLabel}</strong> request has been <strong>${status.toLowerCase()}</strong>.
        </p>
      </div>

      ${remark ? `
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #333; margin: 0; font-weight: bold;">Admin Remark:</p>
          <p style="color: #555; margin: 5px 0 0 0;">${remark}</p>
        </div>
      ` : ''}

      ${status === 'APPROVED' ? `
        <p style="color: #555; line-height: 1.6;">
          You can now log in to ExamSlot and make your changes.
        </p>
      ` : `
        <p style="color: #555; line-height: 1.6;">
          If you have questions about this decision, please contact the administration.
        </p>
      `}
    `;

    const mailOptions = {
      from: `"ExamSlot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your ExamSlot Request has been ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      html: this.getEmailTemplate(content, `Request ${status}`),
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordReset(email, name, resetLink) {
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name || 'User'},</p>
      
      <p style="color: #555; line-height: 1.6;">
        We received a request to reset your ExamSlot password. Click the button below to set a new password.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="color: #555; line-height: 1.6;">
        This link expires in <strong>24 hours</strong>. If you did not request this, please ignore this email.
      </p>
    `;

    const mailOptions = {
      from: `"ExamSlot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your ExamSlot Password',
      html: this.getEmailTemplate(content, 'Reset Password'),
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendAccountPassword(email, name, password, isReset = false) {
    const loginUrl = `${process.env.FRONTEND_URL || ''}/login`;
    const title = isReset ? 'Your ExamSlot password was reset' : 'Your ExamSlot login';
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
      <p style="color: #555; line-height: 1.6;">Dear ${name || 'Student'},</p>
      <p style="color: #555; line-height: 1.6;">Use these details to sign in:</p>
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #333;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0; color: #333;"><strong>Password:</strong> ${password}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign in</a>
      </div>
    `;
    return await this.transporter.sendMail({
      from: `"ExamSlot" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: title,
      html: this.getEmailTemplate(content, title),
    });
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connected successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
