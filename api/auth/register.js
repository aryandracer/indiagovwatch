const crypto = require('crypto');

// In-memory storage for testing (use a database in production)
// Note: This resets on each deployment - use Vercel KV or Postgres for persistence
const users = new Map();
const subscriptions = new Map();

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
    if (!mobile || mobile.trim().length < 10) errors.push('Valid mobile number is required');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    // Check if user exists (by email)
    let existingUser = null;
    for (const [id, user] of users) {
      if (user.email === email.toLowerCase()) {
        existingUser = { id, ...user };
        break;
      }
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
        userId: existingUser.id
      });
    }

    // Create new user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const user = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      language: language || 'English',
      created_at: now
    };

    users.set(userId, user);

    // Create subscription with 7-day trial
    const subscriptionId = crypto.randomUUID();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const subscription = {
      user_id: userId,
      plan: plan || 'bharat',
      status: 'trial',
      trial_end: trialEnd.toISOString(),
      created_at: now
    };

    subscriptions.set(subscriptionId, subscription);

    // Export for other API routes
    global.users = users;
    global.subscriptions = subscriptions;

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your 7-day trial has started.',
      data: {
        userId,
        subscriptionId,
        plan: subscription.plan,
        trialEnd: subscription.trial_end
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};
