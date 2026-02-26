require('dotenv').config();
const { userQueries, otpQueries, subscriptionQueries } = require('../../lib/supabase');
const { generateToken } = require('../../middleware/auth');

/**
 * Verify OTP and return authentication token
 *
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 *
 * Response:
 * - 200: Authentication successful, returns JWT token
 * - 400: Invalid input
 * - 401: Invalid or expired OTP
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
    const { email, otp } = req.body;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'OTP is required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be 6 digits'
      });
    }

    // Find valid OTP
    let validOtp;
    try {
      validOtp = await otpQueries.findValidOtp(normalizedEmail, normalizedOtp);
    } catch (error) {
      console.error('Error finding OTP:', error.message);
    }

    if (!validOtp) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired OTP',
        message: 'Please request a new OTP'
      });
    }

    // Mark OTP as used
    try {
      await otpQueries.markUsed(validOtp.id);
    } catch (error) {
      console.error('Error marking OTP as used:', error.message);
    }

    // Get user
    let user;
    try {
      user = await userQueries.findByEmail(normalizedEmail);
    } catch (error) {
      console.error('Error finding user:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify user. Please try again.'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get subscription status
    let subscription = null;
    try {
      subscription = await subscriptionQueries.findByUserId(user.id);
    } catch (error) {
      console.error('Error finding subscription:', error.message);
    }

    // Generate JWT token
    const token = generateToken(user);

    console.log(`User ${normalizedEmail} authenticated successfully`);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        language: user.language
      },
      subscription: subscription ? {
        plan: subscription.plan,
        status: subscription.status,
        trialEnd: subscription.trial_end,
        endDate: subscription.end_date
      } : null
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};
