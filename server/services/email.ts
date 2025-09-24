import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
const apiKey = process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY_ENV_VAR;

if (apiKey) {
  mailService.setApiKey(apiKey);
}

export async function sendVerificationEmail(to: string, verificationCode: string): Promise<boolean> {
  if (!apiKey) {
    console.warn('SendGrid API key not found, skipping email send');
    return false;
  }

  try {
    await mailService.send({
      to,
      from: 'jadenafrix10@gmail.com',
      subject: 'MR AFRIX MD - Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af; text-align: center;">MR AFRIX MD</h1>
          <h2>Email Verification</h2>
          <p>Thank you for signing up! Please use the following verification code to complete your registration:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #1e40af; font-size: 36px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 10 minutes. If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="text-align: center; color: #6b7280; font-size: 14px;">
            MR AFRIX MD - WhatsApp Bot Deployment Platform<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}
