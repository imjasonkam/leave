const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized && this.transporter) {
      return;
    }

    try {
      const {
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN,
        GMAIL_USER_EMAIL
      } = process.env;

      // 如果沒有配置 OAuth2，使用簡單的 SMTP（用於開發環境）
      if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        console.warn('[EmailService] Gmail OAuth2 配置未找到，使用 SMTP 配置');
        
        // 使用環境變數中的 SMTP 配置（如果有的話）
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER || GMAIL_USER_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });
      } else {
        // 使用 Google OAuth2
        const oauth2Client = new OAuth2(
          GMAIL_CLIENT_ID,
          GMAIL_CLIENT_SECRET,
          'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
          refresh_token: GMAIL_REFRESH_TOKEN
        });

        const accessToken = await oauth2Client.getAccessToken();

        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: GMAIL_USER_EMAIL,
            clientId: GMAIL_CLIENT_ID,
            clientSecret: GMAIL_CLIENT_SECRET,
            refreshToken: GMAIL_REFRESH_TOKEN,
            accessToken: accessToken.token
          }
        });
      }

      // 驗證連接
      await this.transporter.verify();
      this.initialized = true;
      console.log('[EmailService] Email service 初始化成功');
    } catch (error) {
      console.error('[EmailService] 初始化失敗:', error.message);
      // 不拋出錯誤，允許系統繼續運行（email 功能可選）
      this.transporter = null;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      console.warn('[EmailService] Email transporter 未初始化，跳過發送 email');
      return false;
    }

    // 檢查 email 是否為 null 或空
    if (!to || !to.trim()) {
      console.log('[EmailService] 收件人 email 為空，跳過發送');
      return false;
    }

    try {
      const fromEmail = process.env.GMAIL_USER_EMAIL || process.env.SMTP_USER || 'noreply@example.com';
      
      const mailOptions = {
        from: `"假期管理系統" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '') // 如果沒有提供 text，從 html 提取
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EmailService] Email 發送成功:', info.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] 發送 email 失敗:', error.message);
      return false;
    }
  }

  async sendBulkEmails(recipients, { subject, html, text }) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return;
    }

    // 過濾掉 email 為 null 或空的收件人
    const validRecipients = recipients.filter(email => email && email.trim());

    if (validRecipients.length === 0) {
      console.log('[EmailService] 沒有有效的收件人，跳過批量發送');
      return;
    }

    // 為每個收件人發送 email（避免使用 BCC，因為某些服務可能不支持）
    const sendPromises = validRecipients.map(email => 
      this.sendEmail({ to: email, subject, html, text })
    );

    await Promise.allSettled(sendPromises);
  }

  // 發送假期申請通知給批核者
  async sendApprovalNotification(application, approvers, stage) {
    if (!application || !approvers || approvers.length === 0) {
      return;
    }

    const stageNames = {
      checker: '檢查',
      approver_1: '第一批核',
      approver_2: '第二批核',
      approver_3: '第三批核'
    };

    const stageName = stageNames[stage] || stage;

    // 獲取申請人信息
    const User = require('../database/models/User');
    const LeaveType = require('../database/models/LeaveType');
    
    const applicant = await User.findById(application.user_id);
    const leaveType = await LeaveType.findById(application.leave_type_id);

    const applicantName = applicant?.display_name || applicant?.name_zh || '申請人';
    const leaveTypeName = leaveType?.name_zh || leaveType?.name || '假期';
    const transactionId = application.transaction_id || `LA-${String(application.id).padStart(6, '0')}`;

    const subject = `【假期管理系統】新的假期申請需要批核 - ${stageName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; }
          .footer { margin-top: 20px; padding: 10px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>假期申請批核通知</h2>
          </div>
          <div class="content">
            <p>您好，</p>
            <p>您有一份新的假期申請需要進行 <strong>${stageName}</strong> 批核。</p>
            <div class="info-row">
              <span class="label">申請編號：</span> ${transactionId}
            </div>
            <div class="info-row">
              <span class="label">申請人：</span> ${applicantName}
            </div>
            <div class="info-row">
              <span class="label">假期類型：</span> ${leaveTypeName}
            </div>
            <div class="info-row">
              <span class="label">開始日期：</span> ${new Date(application.start_date).toLocaleDateString('zh-TW')}
            </div>
            <div class="info-row">
              <span class="label">結束日期：</span> ${new Date(application.end_date).toLocaleDateString('zh-TW')}
            </div>
            <div class="info-row">
              <span class="label">天數：</span> ${application.total_days} 天
            </div>
            ${application.reason ? `
            <div class="info-row">
              <span class="label">申請原因：</span> ${application.reason}
            </div>
            ` : ''}
            <p style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/approvals/${application.id}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                前往批核
              </a>
            </p>
          </div>
          <div class="footer">
            <p>此為系統自動發送的郵件，請勿直接回覆。</p>
            <p>假期管理系統</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 獲取所有批核者的 email
    const approverEmails = approvers
      .map(approver => approver.email)
      .filter(email => email && email.trim());

    if (approverEmails.length > 0) {
      await this.sendBulkEmails(approverEmails, { subject, html });
    }
  }

  // 發送申請完成通知給申請者
  async sendApprovalCompleteNotification(application) {
    if (!application) {
      return;
    }

    const User = require('../database/models/User');
    const LeaveType = require('../database/models/LeaveType');
    
    const applicant = await User.findById(application.user_id);
    const leaveType = await LeaveType.findById(application.leave_type_id);

    if (!applicant || !applicant.email) {
      console.log('[EmailService] 申請者 email 為空，跳過發送完成通知');
      return;
    }

    const applicantName = applicant.display_name || applicant.name_zh || '申請人';
    const leaveTypeName = leaveType?.name_zh || leaveType?.name || '假期';
    const transactionId = application.transaction_id || `LA-${String(application.id).padStart(6, '0')}`;

    const subject = `【假期管理系統】您的假期申請已批准`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; }
          .footer { margin-top: 20px; padding: 10px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>假期申請已批准</h2>
          </div>
          <div class="content">
            <p>${applicantName}，您好</p>
            <p>您的假期申請已通過所有批核階段，現已批准。</p>
            <div class="info-row">
              <span class="label">申請編號：</span> ${transactionId}
            </div>
            <div class="info-row">
              <span class="label">假期類型：</span> ${leaveTypeName}
            </div>
            <div class="info-row">
              <span class="label">開始日期：</span> ${new Date(application.start_date).toLocaleDateString('zh-TW')}
            </div>
            <div class="info-row">
              <span class="label">結束日期：</span> ${new Date(application.end_date).toLocaleDateString('zh-TW')}
            </div>
            <div class="info-row">
              <span class="label">天數：</span> ${application.total_days} 天
            </div>
            ${application.reason ? `
            <div class="info-row">
              <span class="label">申請原因：</span> ${application.reason}
            </div>
            ` : ''}
            <p style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/leaves/${application.id}" 
                 style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                查看詳情
              </a>
            </p>
          </div>
          <div class="footer">
            <p>此為系統自動發送的郵件，請勿直接回覆。</p>
            <p>假期管理系統</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: applicant.email, subject, html });
  }

  // 發送申請拒絕通知給申請者
  async sendRejectionNotification(application, rejectionReason) {
    if (!application) {
      return;
    }

    const User = require('../database/models/User');
    const LeaveType = require('../database/models/LeaveType');
    
    const applicant = await User.findById(application.user_id);
    const leaveType = await LeaveType.findById(application.leave_type_id);

    if (!applicant || !applicant.email) {
      console.log('[EmailService] 申請者 email 為空，跳過發送拒絕通知');
      return;
    }

    const applicantName = applicant.display_name || applicant.name_zh || '申請人';
    const leaveTypeName = leaveType?.name_zh || leaveType?.name || '假期';
    const transactionId = application.transaction_id || `LA-${String(application.id).padStart(6, '0')}`;

    const subject = `【假期管理系統】您的假期申請已被拒絕`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; }
          .rejection-reason { background-color: #ffebee; padding: 15px; margin: 15px 0; border-left: 4px solid #f44336; }
          .footer { margin-top: 20px; padding: 10px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>假期申請已被拒絕</h2>
          </div>
          <div class="content">
            <p>${applicantName}，您好</p>
            <p>很抱歉，您的假期申請已被拒絕。</p>
            <div class="info-row">
              <span class="label">申請編號：</span> ${transactionId}
            </div>
            <div class="info-row">
              <span class="label">假期類型：</span> ${leaveTypeName}
            </div>
            <div class="info-row">
              <span class="label">開始日期：</span> ${new Date(application.start_date).toLocaleDateString('zh-TW')}
            </div>
            <div class="info-row">
              <span class="label">結束日期：</span> ${new Date(application.end_date).toLocaleDateString('zh-TW')}
            </div>
            <div class="info-row">
              <span class="label">天數：</span> ${application.total_days} 天
            </div>
            ${rejectionReason ? `
            <div class="rejection-reason">
              <strong>拒絕原因：</strong><br>
              ${rejectionReason}
            </div>
            ` : ''}
            <p style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/leaves/${application.id}" 
                 style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                查看詳情
              </a>
            </p>
          </div>
          <div class="footer">
            <p>此為系統自動發送的郵件，請勿直接回覆。</p>
            <p>假期管理系統</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({ to: applicant.email, subject, html });
  }
}

// 導出單例
const emailService = new EmailService();

module.exports = emailService;

