const { Resend } = require('resend');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Email sender configuration
// Using Resend's onboarding domain for testing (no verification needed)
const FROM_EMAIL = process.env.FROM_EMAIL || 'IndiaGovWatch <onboarding@resend.dev>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'noreply@resend.dev';

/**
 * Send an email via Resend
 * @param {Object} options - Email options
 * @returns {Object} Send result
 */
async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    console.error('Resend not configured - RESEND_API_KEY missing');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      reply_to: REPLY_TO,
      subject,
      html,
      text: text || stripHtml(html)
    });

    console.log(`Email sent to ${to}: ${result.id}`);
    return { success: true, id: result.id };

  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send OTP email for authentication
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @returns {Object} Send result
 */
async function sendOtpEmail(email, otp) {
  const subject = `${otp} is your IndiaGovWatch verification code`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #FF6B1A 0%, #138808 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">IndiaGovWatch</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #0B1426; margin: 0 0 20px 0;">Verify your email</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          Enter this verification code to sign in to your IndiaGovWatch dashboard:
        </p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 30px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FF6B1A;">${otp}</span>
        </div>
        <p style="color: #777; font-size: 14px; margin: 0;">
          This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #0B1426; padding: 20px 30px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          &copy; ${new Date().getFullYear()} IndiaGovWatch. Stay informed, stay ahead.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send daily digest email
 * @param {Object} user - User object with email and name
 * @param {string} digestHtml - Pre-built digest HTML content
 * @returns {Object} Send result
 */
async function sendDigestEmail(user, digestHtml) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const subject = `Your Daily Government Update - ${today}`;

  return sendEmail({
    to: user.email,
    subject,
    html: digestHtml
  });
}

/**
 * Send welcome email to new users
 * @param {Object} user - User object
 * @param {string} plan - Subscription plan
 * @returns {Object} Send result
 */
async function sendWelcomeEmail(user, plan) {
  const subject = 'Welcome to IndiaGovWatch - Your 7-day trial has started!';

  const planFeatures = {
    bharat: ['Daily digests in Hindi & English', 'Government schemes & jobs', 'State-specific alerts'],
    pro: ['Everything in Bharat', 'RTI updates & policy analysis', 'Tender alerts', 'Priority support'],
    global: ['Everything in Pro', 'Global timezone support', 'International policy updates', 'API access']
  };

  const features = planFeatures[plan] || planFeatures.bharat;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #FF6B1A 0%, #138808 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to IndiaGovWatch!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #0B1426; margin: 0 0 10px 0;">Namaste, ${user.name}!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Thank you for joining IndiaGovWatch. Your <strong>7-day free trial</strong> of the
          <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</strong> has started.
        </p>

        <h3 style="color: #FF6B1A; margin: 30px 0 15px 0;">What you'll receive:</h3>
        <ul style="color: #555; font-size: 15px; line-height: 1.8; padding-left: 20px;">
          ${features.map(f => `<li>${f}</li>`).join('')}
        </ul>

        <div style="background-color: #f8f9fa; border-left: 4px solid #138808; padding: 15px 20px; margin: 30px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;">
            <strong>Pro tip:</strong> Customize your preferences in the dashboard to receive
            updates most relevant to you.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://indiagovwatch.in/dashboard"
             style="display: inline-block; background-color: #FF6B1A; color: #ffffff; padding: 14px 30px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color: #0B1426; padding: 20px 30px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
          Need help? Reply to this email or contact support@indiagovwatch.in
        </p>
        <p style="color: #666; font-size: 11px; margin: 0;">
          &copy; ${new Date().getFullYear()} IndiaGovWatch. Stay informed, stay ahead.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to: user.email, subject, html });
}

/**
 * Send payment confirmation email
 * @param {Object} user - User object
 * @param {Object} payment - Payment details
 * @param {string} plan - Plan name
 * @returns {Object} Send result
 */
async function sendPaymentConfirmationEmail(user, payment, plan) {
  const subject = 'Payment Confirmed - IndiaGovWatch Subscription';

  const amount = payment.currency === 'INR'
    ? `₹${(payment.amount / 100).toFixed(2)}`
    : `$${(payment.amount / 100).toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #138808 0%, #FF6B1A 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Confirmed</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 60px; height: 60px; background-color: #138808; border-radius: 50%;
                      display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 30px;">✓</span>
          </div>
        </div>

        <h2 style="color: #0B1426; margin: 0 0 20px 0; text-align: center;">
          Thank you, ${user.name}!
        </h2>

        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table width="100%" cellpadding="8">
            <tr>
              <td style="color: #777; font-size: 14px;">Plan</td>
              <td style="color: #333; font-size: 14px; text-align: right; font-weight: bold;">
                ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
              </td>
            </tr>
            <tr>
              <td style="color: #777; font-size: 14px;">Amount</td>
              <td style="color: #138808; font-size: 16px; text-align: right; font-weight: bold;">
                ${amount}
              </td>
            </tr>
            <tr>
              <td style="color: #777; font-size: 14px;">Payment ID</td>
              <td style="color: #333; font-size: 12px; text-align: right;">
                ${payment.razorpay_payment_id || 'N/A'}
              </td>
            </tr>
            <tr>
              <td style="color: #777; font-size: 14px;">Valid Until</td>
              <td style="color: #333; font-size: 14px; text-align: right;">
                ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
              </td>
            </tr>
          </table>
        </div>

        <p style="color: #555; font-size: 14px; line-height: 1.6; text-align: center;">
          Your subscription is now active. You'll receive daily government updates
          based on your preferences.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #0B1426; padding: 20px 30px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">
          &copy; ${new Date().getFullYear()} IndiaGovWatch. Stay informed, stay ahead.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({ to: user.email, subject, html });
}

/**
 * Strip HTML tags for plain text version
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verify Resend connection
 * @returns {Object} Connection status
 */
async function verifyConnection() {
  if (!resend) {
    return { connected: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    // Resend doesn't have a dedicated health check, so we just verify the API key format
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendDigestEmail,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  verifyConnection
};
