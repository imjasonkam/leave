require('dotenv').config();
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

async function testOAuth2() {
  console.log('=== OAuth2 配置測試 ===\n');
  
  const {
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN,
    GMAIL_USER_EMAIL
  } = process.env;
  
  console.log('環境變數檢查:');
  console.log('  GMAIL_CLIENT_ID:', GMAIL_CLIENT_ID ? `${GMAIL_CLIENT_ID.substring(0, 20)}...` : '❌ 未設置');
  console.log('  GMAIL_CLIENT_SECRET:', GMAIL_CLIENT_SECRET ? '✅ 已設置' : '❌ 未設置');
  console.log('  GMAIL_REFRESH_TOKEN:', GMAIL_REFRESH_TOKEN ? `${GMAIL_REFRESH_TOKEN.substring(0, 20)}...` : '❌ 未設置');
  console.log('  GMAIL_USER_EMAIL:', GMAIL_USER_EMAIL || '❌ 未設置');
  console.log('');
  
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_USER_EMAIL) {
    console.error('❌ 錯誤：缺少必要的 OAuth2 配置');
    console.error('請在 .env 文件中設置所有必要的環境變數');
    process.exit(1);
  }
  
  try {
    console.log('正在創建 OAuth2 客戶端...');
    const oauth2Client = new OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    console.log('設置 refresh token...');
    oauth2Client.setCredentials({
      refresh_token: GMAIL_REFRESH_TOKEN
    });
    
    console.log('正在獲取 access token...');
    const tokenResponse = await oauth2Client.getAccessToken();
    
    if (!tokenResponse || !tokenResponse.token) {
      console.error('❌ 錯誤：無法獲取 access token');
      console.error('可能的原因：');
      console.error('1. Refresh token 已過期或無效');
      console.error('2. Client ID 或 Client Secret 不正確');
      console.error('3. Gmail API 未啟用');
      process.exit(1);
    }
    
    console.log('✅ Access token 獲取成功');
    console.log('  Token 長度:', tokenResponse.token.length);
    console.log('');
    
    // 測試 Gmail API 連接
    console.log('正在測試 Gmail API 連接...');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    console.log('✅ Gmail API 連接成功');
    console.log('  Email 地址:', profile.data.emailAddress);
    console.log('');
    console.log('✅ 所有測試通過！OAuth2 配置正確。');
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error('');
    console.error('錯誤詳情:');
    if (error.response) {
      console.error('  狀態碼:', error.response.status);
      console.error('  錯誤數據:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('');
    console.error('可能的解決方案:');
    console.error('1. 檢查 refresh token 是否有效');
    console.error('2. 前往 OAuth Playground 重新獲取 refresh token');
    console.error('3. 確認 Gmail API 已在 Google Cloud Console 中啟用');
    console.error('4. 確認 OAuth 2.0 憑證配置正確');
    process.exit(1);
  }
}

testOAuth2();

