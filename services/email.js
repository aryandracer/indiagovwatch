const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Use App Password for Gmail
  }
});

// Verify transporter connection
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log('Email service connected successfully');
    return true;
  } catch (error) {
    console.error('Email service connection failed:', error.message);
    return false;
  }
}

// Send welcome email
async function sendWelcomeEmail(user, plan) {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  const mailOptions = {
    from: `"IndiaGovWatch" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Welcome to IndiaGovWatch! Your 7-day free trial has started 🇮🇳`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF6B1A, #138808); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .plan-badge { display: inline-block; background: #FF6B1A; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          .cta-button { display: inline-block; background: #FF6B1A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { padding: 8px 0; border-bottom: 1px solid #eee; }
          .feature-item:last-child { border-bottom: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🇮🇳 IndiaGovWatch</h1>
          </div>
          <div class="content">
            <h2>Namaste, ${user.name}! 🙏</h2>
            <p>Welcome to <strong>IndiaGovWatch</strong> — India's civic intelligence platform.</p>

            <p>You've started your <strong>7-day free trial</strong> of the <span class="plan-badge">${plan}</span></p>

            <p><strong>Your trial ends on:</strong> ${trialEndDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div class="features">
              <h3>What's included:</h3>
              <div class="feature-item">✓ Government scheme alerts (Central + State)</div>
              <div class="feature-item">✓ Job notifications (UPSC, SSC, Railways, Banks)</div>
              <div class="feature-item">✓ Daily digest in ${user.language}</div>
              <div class="feature-item">✓ Email + WhatsApp alerts</div>
              ${plan !== 'Bharat Plan' ? '<div class="feature-item">✓ Tender intelligence</div>' : ''}
              ${plan !== 'Bharat Plan' ? '<div class="feature-item">✓ RTI & Court summaries</div>' : ''}
            </div>

            <p>We'll send you your first digest within 24 hours. Meanwhile, keep an eye on your inbox for important government updates!</p>

            <a href="#" class="cta-button">Explore Your Dashboard →</a>

            <p style="color: #666; font-size: 14px;">
              Questions? Just reply to this email — we read every message.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 IndiaGovWatch. Made with 🇮🇳 for the world.</p>
            <p>Not affiliated with any government body.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    return false;
  }
}

// Send payment confirmation email
async function sendPaymentConfirmationEmail(user, payment, plan) {
  const mailOptions = {
    from: `"IndiaGovWatch" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Payment Confirmed! Your ${plan.name} subscription is active 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #138808, #FF6B1A); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; font-weight: bold; }
          .success-badge { background: #138808; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🇮🇳 Payment Successful!</h1>
          </div>
          <div class="content">
            <div class="success-badge">✓ Payment Confirmed</div>

            <h2>Thank you, ${user.name}!</h2>
            <p>Your subscription to <strong>${plan.name}</strong> is now active.</p>

            <div class="receipt">
              <h3>Receipt</h3>
              <div class="receipt-row">
                <span>Plan</span>
                <span>${plan.name}</span>
              </div>
              <div class="receipt-row">
                <span>Amount</span>
                <span>${payment.currency === 'INR' ? '₹' : '$'}${payment.amount / 100}</span>
              </div>
              <div class="receipt-row">
                <span>Payment ID</span>
                <span>${payment.razorpay_payment_id}</span>
              </div>
              <div class="receipt-row">
                <span>Date</span>
                <span>${new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            <p>Your subscription will auto-renew monthly. You can cancel anytime from your dashboard.</p>

            <p style="color: #666; font-size: 14px;">
              This email serves as your payment receipt. For support, reply to this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2025 IndiaGovWatch. Made with 🇮🇳 for the world.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Payment confirmation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error.message);
    return false;
  }
}

module.exports = {
  verifyConnection,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail
};
