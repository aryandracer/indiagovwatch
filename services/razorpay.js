const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Plan pricing configuration (amounts in smallest currency unit)
const PLANS = {
  bharat: { amount: 9900, currency: 'INR', name: 'Bharat Plan', description: 'For individuals' },
  pro: { amount: 29900, currency: 'INR', name: 'Pro Plan', description: 'For professionals & NRIs' },
  global: { amount: 900, currency: 'USD', name: 'Global Plan', description: 'For international users' }
};

// Create Razorpay order
async function createOrder(planId, userId, userEmail) {
  const plan = PLANS[planId];

  if (!plan) {
    throw new Error('Invalid plan selected');
  }

  const options = {
    amount: plan.amount,
    currency: plan.currency,
    receipt: `receipt_${userId}_${Date.now()}`,
    notes: {
      userId: userId,
      planId: planId,
      email: userEmail
    }
  };

  const order = await razorpay.orders.create(options);
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    planName: plan.name
  };
}

// Verify payment signature
function verifyPaymentSignature(orderId, paymentId, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expectedSignature === signature;
}

// Get plan details
function getPlanDetails(planId) {
  return PLANS[planId] || null;
}

// Get all plans
function getAllPlans() {
  return Object.entries(PLANS).map(([id, plan]) => ({
    id,
    ...plan,
    displayAmount: plan.currency === 'INR'
      ? `₹${plan.amount / 100}`
      : `$${plan.amount / 100}`
  }));
}

module.exports = {
  razorpay,
  PLANS,
  createOrder,
  verifyPaymentSignature,
  getPlanDetails,
  getAllPlans
};
