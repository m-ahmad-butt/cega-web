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

  getEmailTemplate(content, title = 'UnCooked') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:24px;background:#f7f7f5;font-family:Georgia,'Times New Roman',serif;color:#37352f;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e9e9e7;">
          <div style="background:#37352f;color:#ffffff;padding:22px 28px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.4px;">VIRTUAL UNIVERSITY</p>
            <p style="margin:6px 0 0;font-size:20px;">UnCooked</p>
          </div>
          <div style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#37352f;">
            ${content}
          </div>
          <div style="padding:16px 28px;border-top:1px solid #e9e9e7;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#787774;">
            Examination Office. This message was generated automatically. Please do not reply.
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
      'Your UnCooked verification code is:',
      otp,
      '',
      'This code expires in 10 minutes.',
      'If you did not request this, you can ignore this email.',
      '',
      `Sent by UnCooked <${fromAddress}>`,
    ].join('\n');

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222;">
        <p style="margin:0 0 16px;">Hi ${displayName},</p>
        <p style="margin:0 0 16px;">Your UnCooked verification code is:</p>
        <p style="margin:0 0 16px;font-size:28px;font-weight:bold;letter-spacing:6px;">${otp}</p>
        <p style="margin:0 0 16px;">This code expires in 10 minutes.</p>
        <p style="margin:0;color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"UnCooked" <${fromAddress}>`,
      to: email,
      replyTo: fromAddress,
      subject: `${otp} is your UnCooked verification code`,
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
          Your UnCooked account has been created by an administrator. Please click the button below to set up your password and activate your account.
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
      from: `"UnCooked" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Set Up Your UnCooked Account',
      html: this.getEmailTemplate(content, 'Set Up Your UnCooked Account'),
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
          You can now log in to UnCooked and make your changes.
        </p>
      ` : `
        <p style="color: #555; line-height: 1.6;">
          If you have questions about this decision, please contact the administration.
        </p>
      `}
    `;

    const mailOptions = {
      from: `"UnCooked" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your UnCooked Request has been ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      html: this.getEmailTemplate(content, `Request ${status}`),
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordReset(email, name, resetLink) {
    const content = `
      <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
      <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">Dear ${name || 'User'},</p>
      
      <p style="color: #555; line-height: 1.6;">
        We received a request to reset your UnCooked password. Click the button below to set a new password.
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
      from: `"UnCooked" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your UnCooked Password',
      html: this.getEmailTemplate(content, 'Reset Password'),
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendAccountPassword(email, name, password, isReset = false) {
    const loginUrl = `${process.env.FRONTEND_URL || ''}/login`;
    const title = isReset ? 'Your UnCooked password was reset' : 'Your UnCooked login';
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
      from: `"UnCooked" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: title,
      html: this.getEmailTemplate(content, title),
    });
  }

  async sendDateSheet(email, name, pdfBuffer, rows) {
    const escape = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const bodyRows = (rows || []).map((row) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.number)}</td>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.code)}</td>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.title)}</td>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.level)}</td>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.date)}</td>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.time)}</td>
        <td style="padding:8px;border-bottom:1px solid #e9e9e7;">${escape(row.gap)}</td>
      </tr>
    `).join('');
    const content = `
      <p style="margin:0 0 12px;">Dear ${escape(name || 'Student')},</p>
      <p style="margin:0 0 16px;">Your examination date sheet is attached to this message. The same document can be downloaded from your student account.</p>
      <p style="margin:0 0 16px;">Suggested spacing is 1 day for an easy paper, 3 days for a medium paper, and 7 days for a hard paper.</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#37352f;color:#ffffff;">
            <th style="padding:8px;text-align:left;">No.</th>
            <th style="padding:8px;text-align:left;">Code</th>
            <th style="padding:8px;text-align:left;">Course</th>
            <th style="padding:8px;text-align:left;">Level</th>
            <th style="padding:8px;text-align:left;">Date</th>
            <th style="padding:8px;text-align:left;">Time</th>
            <th style="padding:8px;text-align:left;">Gap</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `;
    return this.transporter.sendMail({
      from: `"UnCooked" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Examination date sheet',
      html: this.getEmailTemplate(content, 'Examination date sheet'),
      attachments: [{
        filename: 'Examination-Date-Sheet.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
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
