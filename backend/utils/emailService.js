const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    // 對於 OAuth2，每次都重新獲取 access token（因為 token 會過期）
    // 對於 SMTP，可以重用 transporter
    const {
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN
    } = process.env;

    // 如果使用 SMTP 且已初始化，可以重用
    if (this.initialized && this.transporter && (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN)) {
      return;
    }
    
    // 對於 OAuth2，每次都重新初始化以獲取新的 access token
    // 重置 initialized 標記，強制重新初始化
    if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
      this.initialized = false;
    }

    try {
      const GMAIL_USER_EMAIL = process.env.GMAIL_USER_EMAIL;

      // 如果沒有配置 OAuth2，使用簡單的 SMTP（用於開發環境）
      if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        console.warn('[EmailService] Gmail OAuth2 配置未找到，使用 SMTP 配置');
        
        // 檢查 SMTP 配置
        const smtpUser = process.env.SMTP_USER || GMAIL_USER_EMAIL;
        const smtpPassword = process.env.SMTP_PASSWORD;
        
        if (!smtpUser || !smtpPassword) {
          console.warn('[EmailService] SMTP 配置不完整：');
          console.warn('  - SMTP_USER:', smtpUser ? '已設置' : '未設置');
          console.warn('  - SMTP_PASSWORD:', smtpPassword ? '已設置' : '未設置');
          console.warn('[EmailService] 請在 .env 文件中設置 SMTP_USER 和 SMTP_PASSWORD');
          throw new Error('SMTP 配置不完整');
        }
        
        // 使用環境變數中的 SMTP 配置（如果有的話）
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: smtpUser,
            pass: smtpPassword
          }
        });
      } else {
        // 使用 Google OAuth2
        console.log('[EmailService] 使用 Google OAuth2 配置');
        
        // 驗證必要的環境變數
        if (!GMAIL_USER_EMAIL) {
          throw new Error('GMAIL_USER_EMAIL 未設置');
        }
        
        const oauth2Client = new OAuth2(
          GMAIL_CLIENT_ID,
          GMAIL_CLIENT_SECRET,
          'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
          refresh_token: GMAIL_REFRESH_TOKEN
        });

        // 獲取 access token
        let accessToken;
        try {
          console.log('[EmailService] 正在獲取 access token...');
          const tokenResponse = await oauth2Client.getAccessToken();
          if (!tokenResponse || !tokenResponse.token) {
            console.error('[EmailService] Access token 響應為空:', tokenResponse);
            throw new Error('無法獲取 access token，請檢查 refresh token 是否有效');
          }
          accessToken = tokenResponse.token;
          console.log('[EmailService] Access token 獲取成功，長度:', accessToken ? accessToken.length : 0);
        } catch (tokenError) {
          console.error('[EmailService] 獲取 access token 失敗:');
          console.error('[EmailService] 錯誤訊息:', tokenError.message);
          console.error('[EmailService] 錯誤詳情:', tokenError);
          if (tokenError.response) {
            console.error('[EmailService] 錯誤響應:', tokenError.response.data);
          }
          throw new Error(`OAuth2 認證失敗: ${tokenError.message}。請檢查 GMAIL_REFRESH_TOKEN 是否有效`);
        }

        console.log('[EmailService] 創建 OAuth2 transporter...');
        console.log('[EmailService] 配置檢查:');
        console.log('  - User:', GMAIL_USER_EMAIL);
        console.log('  - Client ID:', GMAIL_CLIENT_ID ? `${GMAIL_CLIENT_ID.substring(0, 20)}...` : '未設置');
        console.log('  - Client Secret:', GMAIL_CLIENT_SECRET ? '已設置' : '未設置');
        console.log('  - Refresh Token:', GMAIL_REFRESH_TOKEN ? `${GMAIL_REFRESH_TOKEN.substring(0, 20)}...` : '未設置');
        console.log('  - Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : '未設置');
        
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: GMAIL_USER_EMAIL,
            clientId: GMAIL_CLIENT_ID,
            clientSecret: GMAIL_CLIENT_SECRET,
            refreshToken: GMAIL_REFRESH_TOKEN,
            accessToken: accessToken
          }
        });
        
        console.log('[EmailService] OAuth2 transporter 創建成功');
      }

      // 驗證連接（對於 OAuth2，驗證可能會失敗，但我們仍然可以嘗試發送）
      try {
        await this.transporter.verify();
        console.log('[EmailService] Email transporter 驗證成功');
      } catch (verifyError) {
        // 驗證失敗不一定是致命錯誤，可能是暫時的網絡問題
        console.warn('[EmailService] Email transporter 驗證失敗，但會繼續嘗試:', verifyError.message);
        // 對於 OAuth2，驗證失敗可能是因為 access token 問題，但我們仍然可以嘗試發送
        if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
          console.warn('[EmailService] OAuth2 驗證失敗，請檢查 refresh token 是否有效');
        }
      }
      
      this.initialized = true;
      console.log('[EmailService] Email service 初始化成功');
    } catch (error) {
      console.error('[EmailService] 初始化失敗:', error.message);
      console.error('[EmailService] 錯誤詳情:', error);
      // 不拋出錯誤，允許系統繼續運行（email 功能可選）
      this.transporter = null;
      this.initialized = false;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    // 每次發送前重新初始化，確保 OAuth2 access token 是最新的
    try {
      await this.initialize();
    } catch (initError) {
      console.error('[EmailService] 初始化失敗，無法發送 email:', initError.message);
      return false;
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
      
      // 如果是 OAuth2，在發送前重新獲取 access token（確保 token 是最新的）
      const {
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN
      } = process.env;
      
      if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
        // 重新獲取 access token
        try {
          const oauth2Client = new OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
          );
          oauth2Client.setCredentials({
            refresh_token: GMAIL_REFRESH_TOKEN
          });
          const tokenResponse = await oauth2Client.getAccessToken();
          if (tokenResponse && tokenResponse.token) {
            // 更新 transporter 的 access token
            this.transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                type: 'OAuth2',
                user: fromEmail,
                clientId: GMAIL_CLIENT_ID,
                clientSecret: GMAIL_CLIENT_SECRET,
                refreshToken: GMAIL_REFRESH_TOKEN,
                accessToken: tokenResponse.token
              }
            });
            console.log('[EmailService] 已更新 access token');
          }
        } catch (tokenError) {
          console.warn('[EmailService] 重新獲取 access token 失敗，使用現有 token:', tokenError.message);
        }
      }
      
      const mailOptions = {
        from: `"假期管理系統" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '') // 如果沒有提供 text，從 html 提取
      };

      console.log('[EmailService] 正在發送 email 到:', to);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EmailService] Email 發送成功:', info.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] 發送 email 失敗:', error.message);
      console.error('[EmailService] 錯誤詳情:', error);
      
      // 提供更詳細的錯誤訊息和解決方案
      if (error.message && error.message.includes('Authentication Required')) {
        console.error('[EmailService] ========== 認證失敗診斷 ==========');
        console.error('[EmailService] 如果使用 OAuth2，請檢查：');
        console.error('1. GMAIL_REFRESH_TOKEN 是否有效（可能已過期，需要重新生成）');
        console.error('2. Gmail API 是否已在 Google Cloud Console 中啟用');
        console.error('3. OAuth 2.0 憑證是否正確配置');
        console.error('4. Redirect URI 是否設置為: https://developers.google.com/oauthplayground');
        console.error('5. 請前往 OAuth Playground 重新獲取 refresh token');
        console.error('[EmailService] ====================================');
      } else if (error.message && error.message.includes('Invalid login')) {
        console.error('[EmailService] 登入失敗 - 請檢查 SMTP_USER 和 SMTP_PASSWORD 是否正確');
      }
      
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

