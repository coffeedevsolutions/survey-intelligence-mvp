import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailService {
  constructor() {
    this.enabled = !!process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yourapp.com';
    this.appName = process.env.APP_NAME || 'AI Survey App';
    this.webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
  }

  /**
   * Send invitation email to new user
   */
  async sendInvitationEmail({ email, token, role, orgName, inviterName }) {
    if (!this.enabled) {
      console.log('Email service not configured - would send invitation to:', email);
      return { success: false, reason: 'Email service not configured' };
    }

    const inviteUrl = `${this.webOrigin}/accept-invite?token=${encodeURIComponent(token)}`;
    
    const msg = {
      to: email,
      from: {
        email: this.fromEmail,
        name: this.appName
      },
      subject: `Invitation to join ${orgName} on ${this.appName}`,
      html: this.generateInvitationHTML({
        email,
        role,
        orgName,
        inviterName,
        inviteUrl,
        expiresInDays: 7
      }),
      text: this.generateInvitationText({
        email,
        role,
        orgName,
        inviterName,
        inviteUrl,
        expiresInDays: 7
      })
    };

    try {
      await sgMail.send(msg);
      console.log(`Invitation email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail({ email, token, orgName }) {
    if (!this.enabled) {
      console.log('Email service not configured - would send password reset to:', email);
      return { success: false, reason: 'Email service not configured' };
    }

    const resetUrl = `${this.webOrigin}/reset-password?token=${encodeURIComponent(token)}`;
    
    const msg = {
      to: email,
      from: {
        email: this.fromEmail,
        name: this.appName
      },
      subject: `Password Reset for ${this.appName}`,
      html: this.generatePasswordResetHTML({ email, resetUrl, orgName }),
      text: this.generatePasswordResetText({ email, resetUrl, orgName })
    };

    try {
      await sgMail.send(msg);
      console.log(`Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send resubmit request email to survey respondent
   */
  async sendResubmitRequestEmail({ 
    email, 
    briefTitle, 
    briefId, 
    comment, 
    reviewerEmail, 
    orgName, 
    sessionId 
  }) {
    if (!this.enabled) {
      console.log('Email service not configured - would send resubmit request to:', email);
      return { success: false, reason: 'Email service not configured' };
    }

    // Create a link back to the survey (if applicable) or just provide context
    const surveyUrl = `${this.webOrigin}/public-survey/${sessionId}`;
    
    const msg = {
      to: email,
      from: {
        email: this.fromEmail,
        name: this.appName
      },
      subject: `Additional Information Requested - ${briefTitle}`,
      html: this.generateResubmitRequestHTML({
        email,
        briefTitle,
        briefId,
        comment,
        reviewerEmail,
        orgName,
        surveyUrl
      }),
      text: this.generateResubmitRequestText({
        email,
        briefTitle,
        briefId,
        comment,
        reviewerEmail,
        orgName,
        surveyUrl
      })
    };

    try {
      await sgMail.send(msg);
      console.log(`Resubmit request email sent to ${email} for brief ${briefId}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending resubmit request email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML template for invitation email
   */
  generateInvitationHTML({ email, role, orgName, inviterName, inviteUrl, expiresInDays }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to ${orgName}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px 0; }
        .button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
            <h2>You're invited to join ${orgName}</h2>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> on ${this.appName} with the role of <strong>${role}</strong>.</p>
            
            <p>Click the button below to accept your invitation and create your account:</p>
            
            <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${inviteUrl}
            </p>
            
            <p><strong>Important:</strong> This invitation will expire in ${expiresInDays} days.</p>
            
            <p>If you have any questions, please contact your organization administrator.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text template for invitation email
   */
  generateInvitationText({ email, role, orgName, inviterName, inviteUrl, expiresInDays }) {
    return `
${this.appName} - Invitation to join ${orgName}

Hello,

${inviterName} has invited you to join ${orgName} on ${this.appName} with the role of ${role}.

To accept your invitation and create your account, visit:
${inviteUrl}

Important: This invitation will expire in ${expiresInDays} days.

If you have any questions, please contact your organization administrator.

---
This email was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
`;
  }

  /**
   * Generate HTML template for password reset email
   */
  generatePasswordResetHTML({ email, resetUrl, orgName }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px 0; }
        .button { 
            display: inline-block; 
            background: #dc3545; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
            <h2>Password Reset Request</h2>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>We received a request to reset your password for your ${this.appName} account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${resetUrl}
            </p>
            
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to ${email}.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text template for password reset email
   */
  generatePasswordResetText({ email, resetUrl, orgName }) {
    return `
${this.appName} - Password Reset Request

Hello,

We received a request to reset your password for your ${this.appName} account.

To reset your password, visit:
${resetUrl}

Important: This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

---
This email was sent to ${email}.
`;
  }

  /**
   * Generate HTML template for resubmit request email
   */
  generateResubmitRequestHTML({ email, briefTitle, briefId, comment, reviewerEmail, orgName, surveyUrl }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Additional Information Requested</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px 0; }
        .comment-box { 
            background: #fff4e6; 
            border-left: 4px solid #ff9500; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 6px;
        }
        .button { 
            display: inline-block; 
            background: #28a745; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
        .brief-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${this.appName}</h1>
            <h2>Additional Information Requested</h2>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>Thank you for your recent submission to <strong>${orgName}</strong>. We've reviewed your project brief and would like to request some additional information to better understand your needs.</p>
            
            <div class="brief-info">
                <h3>Your Project Brief</h3>
                <p><strong>Title:</strong> ${briefTitle}</p>
                <p><strong>Brief ID:</strong> #${briefId}</p>
            </div>
            
            <div class="comment-box">
                <h4>Reviewer Comments:</h4>
                <p>${comment}</p>
                <p><em>— ${reviewerEmail}</em></p>
            </div>
            
            <p>Please review the comments above and provide any additional information requested. You can respond by replying to this email or, if available, by revisiting your original survey.</p>
            
            <div style="text-align: center;">
                <a href="${surveyUrl}" class="button">Update Your Submission</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                ${surveyUrl}
            </p>
            
            <p>If you have any questions about this request or need assistance, please don't hesitate to contact us by replying to this email.</p>
            
            <p>Thank you for your cooperation!</p>
        </div>
        
        <div class="footer">
            <p>This email was sent to ${email} regarding your submission to ${orgName}.</p>
            <p>If you believe this email was sent in error, please contact us.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate plain text template for resubmit request email
   */
  generateResubmitRequestText({ email, briefTitle, briefId, comment, reviewerEmail, orgName, surveyUrl }) {
    return `
${this.appName} - Additional Information Requested

Hello,

Thank you for your recent submission to ${orgName}. We've reviewed your project brief and would like to request some additional information to better understand your needs.

Your Project Brief:
- Title: ${briefTitle}
- Brief ID: #${briefId}

Reviewer Comments:
"${comment}"
— ${reviewerEmail}

Please review the comments above and provide any additional information requested. You can respond by replying to this email or, if available, by revisiting your original survey at:

${surveyUrl}

If you have any questions about this request or need assistance, please don't hesitate to contact us by replying to this email.

Thank you for your cooperation!

---
This email was sent to ${email} regarding your submission to ${orgName}.
If you believe this email was sent in error, please contact us.
`;
  }
}

// Export singleton instance
export const emailService = new EmailService();
