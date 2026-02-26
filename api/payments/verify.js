require('dotenv').config();
const crypto = require('crypto');
const { subscriptionQueries, paymentQueries, userQueries } = require('../../lib/supabase');
const { sendPaymentConfirmationEmail } = require('../../services/notifications/email-sender');

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters'
      });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Payment verified - update database
    if (userId) {
      // Record payment
      await paymentQueries.create({
        user_id: userId,
        razorpay_order_id,
        razorpay_payment_id,
        amount: plan === 'global' ? 900 : (plan === 'pro' ? 29900 : 9900),
        currency: plan === 'global' ? 'USD' : 'INR',
        status: 'completed'
      });

      // Update subscription to active
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      await subscriptionQueries.updateByUserId(userId, {
        status: 'active',
        plan: plan || 'bharat',
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString()
      });

      // Send confirmation email (async)
      const user = await userQueries.findById(userId);
      if (user) {
        sendPaymentConfirmationEmail(user, { razorpay_payment_id, amount: plan === 'global' ? 900 : (plan === 'pro' ? 29900 : 9900), currency: plan === 'global' ? 'USD' : 'INR' }, plan).catch(err => {
          console.error('Payment confirmation email failed:', err.message);
        });
      }
    }

    return res.status(200).json({
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
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};
