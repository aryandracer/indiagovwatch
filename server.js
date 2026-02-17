const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize database
const { initializeDatabase } = require('./db/database');
initializeDatabase();

// Import routes
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// Import Razorpay service
const { createOrder, verifyPaymentSignature, getPlanDetails } = require('./services/razorpay');
const { v4: uuidv4 } = require('uuid');
const { userQueries, subscriptionQueries, paymentQueries } = require('./db/database');

// Direct /create-order endpoint for simplified frontend flow
app.post('/create-order', async (req, res) => {
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
    const validPlans = ['bharat', 'pro', 'global'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be one of: bharat, pro, global'
      });
    }

    // Check if user exists, if not create them
    let user = userQueries.findByEmail.get(email);
    let userId;

    if (!user) {
      // Create new user
      userId = uuidv4();
      userQueries.create.run(userId, name, email, phone, plan, 'en');

      // Create subscription record
      const subscriptionId = uuidv4();
      const now = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      subscriptionQueries.create.run(subscriptionId, userId, plan, 'trial', trialEnd.toISOString(), now.toISOString());
    } else {
      userId = user.id;
      // Update user info if needed
      userQueries.update.run(name, phone, userId);
    }

    // Create Razorpay order
    const order = await createOrder(plan, userId, email);
    const planDetails = getPlanDetails(plan);

    // Store payment record
    const paymentId = uuidv4();
    paymentQueries.create.run(
      paymentId,
      userId,
      order.orderId,
      planDetails.amount,
      planDetails.currency,
      'pending'
    );

    // Return order details for Razorpay checkout
    res.json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      plan_name: order.planName,
      user_name: name,
      user_email: email
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order. Please try again.'
    });
  }
});

// Direct /verify-payment endpoint for simplified frontend flow
app.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, phone, plan } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification fields'
      });
    }

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

    res.json({
      success: true,
      message: 'Payment verified successfully! Your subscription is now active.',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed. Please contact support.'
    });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
