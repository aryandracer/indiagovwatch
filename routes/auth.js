const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { userQueries, subscriptionQueries } = require('../db/database');
const { validateRegistration } = require('../middleware/validate');
const { sendWelcomeEmail } = require('../services/email');
const { getPlanDetails } = require('../services/razorpay');

const router = express.Router();

// POST /api/auth/register - Register user and start 7-day trial
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, mobile, language, plan } = req.body;

    // Check if user already exists
    const existingUser = userQueries.findByEmail.get(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        userId: existingUser.id
      });
    }

    // Create user
    const userId = uuidv4();
    userQueries.create.run(userId, name, email, mobile, language);

    // Create subscription with 7-day trial
    const subscriptionId = uuidv4();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    subscriptionQueries.create.run(
      subscriptionId,
      userId,
      plan,
      'trial',
      trialEnd.toISOString(),
      new Date().toISOString()
    );

    // Get plan details for email
    const planDetails = getPlanDetails(plan);
    const planName = planDetails ? planDetails.name : 'Bharat Plan';

    // Send welcome email (async, don't wait)
    sendWelcomeEmail({ name, email, language }, planName).catch(err => {
      console.error('Welcome email failed:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your 7-day free trial has started.',
      data: {
        userId,
        subscriptionId,
        plan,
        trialEnd: trialEnd.toISOString(),
        email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

module.exports = router;
