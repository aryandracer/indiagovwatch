const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { userQueries, subscriptionQueries, paymentQueries } = require('../db/database');
const { validatePaymentVerification, validateCreateOrder } = require('../middleware/validate');
const { createOrder, verifyPaymentSignature, getAllPlans, getPlanDetails } = require('../services/razorpay');
const { sendPaymentConfirmationEmail } = require('../services/email');

const router = express.Router();

// GET /api/payments/plans - Get all plan details with pricing
router.get('/plans', (req, res) => {
  try {
    const plans = getAllPlans();
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
});

// POST /api/payments/create-order - Create Razorpay order
router.post('/create-order', validateCreateOrder, async (req, res) => {
  try {
    const { userId, plan } = req.body;

    // Verify user exists
    const user = userQueries.findById.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create Razorpay order
    const order = await createOrder(plan, userId, user.email);

    // Store payment record
    const paymentId = uuidv4();
    const planDetails = getPlanDetails(plan);

    paymentQueries.create.run(
      paymentId,
      userId,
      order.orderId,
      planDetails.amount,
      planDetails.currency,
      'pending'
    );

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        planName: order.planName,
        keyId: process.env.RAZORPAY_KEY_ID,
        userEmail: user.email,
        userName: user.name
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

// POST /api/payments/verify - Verify payment signature and activate subscription
router.post('/verify', validatePaymentVerification, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Get payment record
    const payment = paymentQueries.findByOrderId.get(razorpay_order_id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Update payment status
    paymentQueries.updateStatus.run('completed', razorpay_payment_id, razorpay_order_id);

    // Get user and subscription
    const user = userQueries.findById.get(payment.user_id);
    const subscription = subscriptionQueries.findByUserId.get(payment.user_id);

    if (subscription) {
      // Calculate subscription end date (1 month from now)
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Update subscription to active
      subscriptionQueries.updateStatus.run('active', endDate.toISOString(), subscription.id);
    }

    // Get plan details for email
    const planDetails = getPlanDetails(subscription?.plan || 'bharat');

    // Send payment confirmation email
    sendPaymentConfirmationEmail(user, {
      ...payment,
      razorpay_payment_id
    }, planDetails).catch(err => {
      console.error('Payment confirmation email failed:', err.message);
    });

    res.json({
      success: true,
      message: 'Payment verified successfully! Your subscription is now active.',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
});

module.exports = router;
