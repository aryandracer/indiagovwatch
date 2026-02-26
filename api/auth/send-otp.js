require('dotenv').config();
const { userQueries, otpQueries } = require('../../lib/supabase');
const { generateOTP, getOTPExpiry } = require('../../middleware/auth');
const { sendOtpEmail } = require('../../services/notifications/email-sender');

/**
 * Send OTP to user's email for authentication
 *
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Response:
 * - 200: OTP sent successfully
 * - 400: Invalid email
 * - 404: User not found (option to register)
 * - 429: Too many requests
 * - 500: Server error
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Check if user exists
    let user;
    try {
      user = await userQueries.findByEmail(normalizedEmail);
    } catch (error) {
      console.error('Error finding user:', error.message);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email',
        message: 'Please register first to create an account',
        action: 'register'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiry(10); // 10 minutes

    // Store OTP in database
    try {
      await otpQueries.create(normalizedEmail, otp, expiresAt);
    } catch (error) {
      console.error('Error storing OTP:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate OTP. Please try again.'
      });
    }

    // Send OTP email
    const emailResult = await sendOtpEmail(normalizedEmail, otp);

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. Please try again.'
      });
    }

    // Clean up expired OTPs in the background
    otpQueries.cleanupExpired().catch(err => {
      console.error('OTP cleanup error:', err.message);
    });

    console.log(`OTP sent to ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      email: normalizedEmail,
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};
