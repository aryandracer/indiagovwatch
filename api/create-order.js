const Razorpay = require('razorpay');

// Plan pricing configuration (amounts in smallest currency unit - paise for INR, cents for USD)
const PLANS = {
  bharat: { amount: 9900, currency: 'INR', name: 'Bharat Plan' },
  pro: { amount: 29900, currency: 'INR', name: 'Pro Plan' },
  global: { amount: 900, currency: 'USD', name: 'Global Plan' }
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, plan } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, phone, plan'
      });
    }

    // Validate plan
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be one of: bharat, pro, global'
      });
    }

    // Check Razorpay credentials
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured'
      });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const planDetails = PLANS[plan];

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: planDetails.amount,
      currency: planDetails.currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        plan: plan
      }
    });

    // Return order details for Razorpay checkout
    return res.status(200).json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      plan_name: planDetails.name,
      user_name: name,
      user_email: email
    });

  } catch (error) {
    console.error('Create order error:', error);
    const errorMessage = error.error?.description || error.message || JSON.stringify(error);
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};
