const nodemailer = require('nodemailer');

let cachedTransporter = null;
let lastConfigKey = null;

function getTransporter() {
  const user = (process.env.EMAIL_USER || '').trim();
  // Strip spaces if user pasted 4x4 App Password like 'abcd efgh ijkl mnop'
  const pass = (process.env.EMAIL_PASS || '').trim().replace(/\s+/g, '');

  const configKey = `${user}:${pass}`;
  if (cachedTransporter && configKey === lastConfigKey) {
    return cachedTransporter;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user || process.env.EMAIL_USER,
      pass: pass || process.env.EMAIL_PASS,
    },
  });

  lastConfigKey = configKey;
  cachedTransporter = transporter;
  return transporter;
}

/**
 * Sends a 6-digit Email OTP to the specified address.
 */
async function sendOtpEmail(email, otp) {
  const fromAddress = process.env.EMAIL_USER || 'no-reply@solardpr.gov.in';
  const mailText = `Your Solar Infrastructure Portal verification code is ${otp}. It expires in 5 minutes.`;

  const mailOptions = {
    from: `"Solar Infrastructure & DPR Portal" <${fromAddress}>`,
    to: email,
    subject: 'Your Solar Infrastructure Portal Verification Code',
    text: mailText,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0b1120; border-radius: 16px; border: 1px solid #1e293b; color: #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 4px 12px; background: rgba(132, 204, 22, 0.15); border: 1px solid rgba(132, 204, 22, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #bef264; text-transform: uppercase; letter-spacing: 1px;">
            MNRE • PM Surya Ghar Yojana
          </div>
          <h2 style="color: #ffffff; margin: 16px 0 6px 0; font-size: 20px; font-weight: 800;">
            Verify Your Registration
          </h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">
            Please enter the 6-digit verification code below to activate your account.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0; padding: 20px; background: #0f172a; border-radius: 12px; border: 1px dashed #334155;">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #a3e635; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0 0 16px 0;">
          This code is strictly confidential and expires in <strong>5 minutes</strong>. If you did not initiate this registration request, please disregard this email.
        </p>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center;">
          <p style="color: #64748b; font-size: 11px; margin: 0;">
            Solar Infrastructure Planning & DPR Automation Platform
          </p>
        </div>
      </div>
    `
  };

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Live SMTP delivery succeeded: OTP delivered to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, devMode: false };
  } catch (error) {
    // In local development or when demo SMTP credentials are used, log the OTP for seamless testability
    console.warn(`[Email Service] Live SMTP delivery failed (${error.message}).`);
    console.log(`=======================================================`);
    console.log(`[DEV OTP NOTIFICATION] Code for ${email} is: [ ${otp} ]`);
    console.log(`=======================================================`);
    return { success: false, devMode: true, error: error.message };
  }
}

module.exports = {
  sendOtpEmail
};
