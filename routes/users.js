const express = require('express');
const { userQueries, subscriptionQueries } = require('../db/database');

const router = express.Router();

// GET /api/users/:id/subscription - Get user's subscription status
router.get('/:id/subscription', (req, res) => {
  try {
    const { id } = req.params;

    // Get user
    const user = userQueries.findById.get(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get subscription
    const subscription = subscriptionQueries.findByUserId.get(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this user'
      });
    }

    // Check if trial has expired
    let status = subscription.status;
    if (status === 'trial' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (new Date() > trialEnd) {
        status = 'expired';
      }
    }

    // Check if subscription has expired
    if (status === 'active' && subscription.end_date) {
      const endDate = new Date(subscription.end_date);
      if (new Date() > endDate) {
        status = 'expired';
      }
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: status,
          trialEnd: subscription.trial_end,
          startDate: subscription.start_date,
          endDate: subscription.end_date
        }
      }
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
});

// GET /api/users/email/:email - Get user by email
router.get('/email/:email', (req, res) => {
  try {
    const { email } = req.params;

    const user = userQueries.findByEmail.get(email.toLowerCase());
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const subscription = subscriptionQueries.findByUserId.get(user.id);

    res.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        hasSubscription: !!subscription,
        plan: subscription?.plan || null
      }
    });

  } catch (error) {
    console.error('Get user by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

module.exports = router;
