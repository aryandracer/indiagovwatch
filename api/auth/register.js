require('dotenv').config();
const { userQueries, subscriptionQueries } = require('../../lib/supabase');
const { sendWelcomeEmail } = require('../../services/notifications/email-sender');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { name, email, mobile, language, plan } = req.body;

    // Validation
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Name is required (min 2 characters)');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
    if (!mobile || mobile.replace(/[\s\-]/g, '').length < 10) errors.push('Valid mobile number is required');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await userQueries.findByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email',
        userId: existingUser.id
      });
    }

    // Create new user in Supabase
    const user = await userQueries.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: mobile.replace(/[\s\-]/g, ''),
      language: language || 'English'
    });

    // Create subscription with 7-day trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const subscription = await subscriptionQueries.create({
      user_id: user.id,
      plan: plan || 'bharat',
      status: 'trial',
      trial_end: trialEnd.toISOString()
    });

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(user, plan || 'bharat').catch(err => {
      console.error('Welcome email failed:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your 7-day trial has started.',
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        plan: subscription.plan,
        trialEnd: subscription.trial_end,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: error.message
    });
  }
};
