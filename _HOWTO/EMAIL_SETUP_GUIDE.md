# Email Service Setup Guide

This guide shows you how to set up email functionality for user invitations in your AI Survey MVP application.

## Free Email Service Options

### 1. SendGrid (Recommended) - 100 emails/day free forever

> **Note**: We plan to migrate to Amazon SES for production once we scale beyond the free tier limits for better cost efficiency and integration with AWS infrastructure.

#### Setup Steps:
1. **Sign up** at [sendgrid.com](https://sendgrid.com)
2. **Verify your domain/email** in SendGrid dashboard
   - ⚠️ **TODO**: Create SendGrid account once you have your production domain
3. **Create an API Key**:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Choose "Full Access" or "Restricted Access" with mail send permissions
   - Copy the generated API key

#### Environment Variables:
Add these to your `api/.env` file:
```bash
SENDGRID_API_KEY=SG.your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
APP_NAME=AI Survey App
WEB_ORIGIN=http://localhost:5173
```

#### Install Dependencies:
```bash
cd api
npm install @sendgrid/mail
```

### 2. Resend - 3,000 emails/month free

#### Setup Steps:
1. **Sign up** at [resend.com](https://resend.com)
2. **Add your domain** or use their test domain
3. **Get your API Key** from the dashboard

#### Implementation:
Replace SendGrid in `emailService.js` with:
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// In your send method:
await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Your invitation',
  html: htmlContent
});
```

### 3. Nodemailer with Gmail SMTP - Completely free

#### Setup Steps:
1. **Enable 2-factor authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"

#### Environment Variables:
```bash
GMAIL_USER=your.gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password_here
```

#### Implementation:
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});
```

### 4. Mailgun - 5,000 emails/month for 3 months

#### Setup Steps:
1. **Sign up** at [mailgun.com](https://mailgun.com)
2. **Verify your domain** (or use sandbox for testing)
3. **Get your API key** from the dashboard

#### Environment Variables:
```bash
MAILGUN_API_KEY=your_api_key_here
MAILGUN_DOMAIN=your-domain.mailgun.org
```

### 5. AWS SES - 62,000 emails/month free (Production Plan)

> **Production Migration Plan**: This is our planned email service for production use due to its excellent scalability, cost-effectiveness, and integration with AWS infrastructure.

#### Setup Steps:
1. **Create AWS account** and navigate to SES
2. **Verify your domain** and email addresses
3. **Request production access** (starts in sandbox mode)
4. **Create IAM user** with SES permissions
5. **Get access keys** for API integration

#### Environment Variables:
```bash
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

#### Migration Benefits:
- **Cost**: $0.10 per 1,000 emails vs SendGrid's pricing
- **Scalability**: Handles millions of emails
- **Integration**: Works seamlessly with other AWS services
- **Reliability**: Enterprise-grade delivery infrastructure

## Current Implementation

The application includes a complete email service with SendGrid integration:

### Features:
- ✅ **Invitation emails** with branded templates
- ✅ **HTML and text versions** for better compatibility
- ✅ **Automatic fallback** when email service is unavailable
- ✅ **Graceful error handling** with manual token sharing
- ✅ **Professional email templates** with organization branding

### Files Modified:
- `api/services/emailService.js` - Email service implementation
- `api/config/server.js` - Integration with invitation endpoint
- `api/package.json` - Added SendGrid dependency

### Testing the Email Service:

1. **Without email configured** (development):
   ```bash
   # Invitations work but emails aren't sent
   # Token is provided in API response for manual sharing
   ```

2. **With SendGrid configured**:
   ```bash
   # Set environment variables
   export SENDGRID_API_KEY="your_key_here"
   export FROM_EMAIL="noreply@yourdomain.com"
   export APP_NAME="Your App Name"
   
   # Restart your server
   npm run dev
   ```

### Email Template Features:
- **Responsive design** that works on mobile and desktop
- **Clear call-to-action** button for accepting invitations
- **Expiration warnings** (7-day default)
- **Fallback text** for email clients that don't support HTML
- **Professional branding** with your app name and organization

### Customization:
You can customize the email templates in `api/services/emailService.js`:
- Change colors and styling in the CSS
- Modify the email copy and messaging
- Add your company logo
- Adjust the invitation expiration period

## Quick Start with SendGrid:

1. **Get SendGrid API Key** (free tier: 100 emails/day)
2. **Add to environment**:
   ```bash
   echo "SENDGRID_API_KEY=your_key_here" >> api/.env
   echo "FROM_EMAIL=noreply@yourdomain.com" >> api/.env
   ```
3. **Install dependency**:
   ```bash
   cd api && npm install @sendgrid/mail
   ```
4. **Restart server** and test invitations!

The system will automatically detect the email configuration and start sending beautiful invitation emails to new users.
