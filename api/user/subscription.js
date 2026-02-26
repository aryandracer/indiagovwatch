require('dotenv').config();
const { subscriptionQueries, paymentQueries, userQueries } = require('../../lib/supabase');
const { authenticateRequest } = require('../../middleware/auth');

/**
 * Get user subscription details
 *
 * GET /api/user/subscription - Get subscription status and history
 *
 * Headers: Authorization: Bearer <token>
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate request
  const auth = await authenticateRequest(req);
  if (!auth) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    // Get current subscription
    const subscription = await subscriptionQueries.findByUserId(auth.userId);

    if (!subscription) {
      return res.status(200).json({
        success: true,
        hasSubscription: false,
        message: 'No active subscription found',
        subscription: null
      });
    }

    // Calculate subscription status details
    const now = new Date();
    let statusDetails = {
      isActive: false,
      isTrial: false,
      isExpired: false,
      daysRemaining: 0
    };

    if (subscription.status === 'trial') {
      statusDetails.isTrial = true;
      if (subscription.trial_end) {
        const trialEnd = new Date(subscription.trial_end);
        statusDetails.daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        statusDetails.isActive = trialEnd > now;
        statusDetails.isExpired = trialEnd <= now;
      }
    } else if (subscription.status === 'active') {
      statusDetails.isActive = true;
      if (subscription.end_date) {
        const endDate = new Date(subscription.end_date);
        statusDetails.daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
        statusDetails.isExpired = endDate <= now;
        if (statusDetails.isExpired) {
          statusDetails.isActive = false;
        }
      }
    } else if (subscription.status === 'expired' || subscription.status === 'cancelled') {
      statusDetails.isExpired = true;
    }

    // Plan features
    const planFeatures = {
      bharat: {
        name: 'Bharat Plan',
        price: '₹99/month',
        features: [
          'Daily digests in Hindi & English',
          'Government schemes & jobs',
          'State-specific alerts',
          'Email support'
        ]
      },
      pro: {
        name: 'Pro Plan',
        price: '₹299/month',
        features: [
          'Everything in Bharat',
          'RTI updates & policy analysis',
          'Tender alerts',
          'Priority support',
          'Custom keyword alerts'
        ]
      },
      global: {
        name: 'Global Plan',
        price: '$9/month',
        features: [
          'Everything in Pro',
          'Global timezone support',
          'International policy updates',
          'API access',
          'Dedicated support'
        ]
      }
    };

    const plan = planFeatures[subscription.plan] || planFeatures.bharat;

    return res.status(200).json({
      success: true,
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        planDetails: plan,
        status: subscription.status,
        statusDetails,
        trialEnd: subscription.trial_end,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        createdAt: subscription.created_at
      }
    });

  } catch (error) {
    console.error('Subscription API error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};
