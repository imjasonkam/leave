# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leave
DB_USER=admin
DB_PASSWORD=admin

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRES_IN=3h

# Server Configuration
PORT=8080
NODE_ENV=development

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-here

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# Gmail OAuth2 Configuration
# 請參考 EMAIL_SETUP.md 獲取這些值
GMAIL_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-google-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-google-oauth-refresh-token
GMAIL_USER_EMAIL=your-email@gmail.com
