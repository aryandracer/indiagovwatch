require('dotenv').config();
const Razorpay = require('razorpay');

// Plan pricing configuration (amounts in smallest currency unit - paise/cents)
const PLANS = {
  bharat: { amount: 9900, currency: 'INR', name: 'Bharat Plan', description: 'For individuals' },
  pro: { amount: 29900, currency: 'INR', name: 'Pro Plan', description: 'For professionals & NRIs' },
  global: { amount: 900, currency: 'USD', name: 'Global Plan', description: 'For international users' }
};

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
    const { userId, plan } = req.body;

    console.log('Create order request:', { userId, plan });

    // Validation
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    // Check Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials missing');
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const planDetails = PLANS[plan];

    // Create Razorpay order
    const options = {
      amount: planDetails.amount,
      currency: planDetails.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: userId,
        planId: plan
      }
    };

    console.log('Creating Razorpay order with options:', options);

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order.id);

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        planName: planDetails.name,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    // Return detailed error for debugging
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message,
      details: error.error || error.description || null,
      keyPresent: !!process.env.RAZORPAY_KEY_ID
    });
  }
};
