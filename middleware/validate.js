// Input validation middleware

// Validate registration input
function validateRegistration(req, res, next) {
  const { name, email, mobile, language, plan } = req.body;
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string') {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }
  }

  // Mobile validation
  if (!mobile || typeof mobile !== 'string') {
    errors.push('Mobile number is required');
  } else {
    // Remove spaces, dashes, and parentheses for validation
    const cleanMobile = mobile.replace(/[\s\-\(\)]/g, '');
    // Accept international format with + or just digits (10-15 digits)
    const mobileRegex = /^\+?[0-9]{10,15}$/;
    if (!mobileRegex.test(cleanMobile)) {
      errors.push('Please provide a valid mobile number');
    }
  }

  // Language validation (optional, defaults to English)
  const validLanguages = [
    'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu',
    'Marathi', 'Kannada', 'Gujarati', 'Malayalam', 'Punjabi'
  ];
  if (language && !validLanguages.includes(language)) {
    errors.push('Please select a valid language');
  }

  // Plan validation
  const validPlans = ['bharat', 'pro', 'global'];
  if (plan && !validPlans.includes(plan)) {
    errors.push('Please select a valid plan');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  // Sanitize inputs
  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.mobile = mobile.replace(/[\s\-\(\)]/g, '');
  req.body.language = language || 'English';
  req.body.plan = plan || 'bharat';

  next();
}

// Validate payment verification input
function validatePaymentVerification(req, res, next) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const errors = [];

  if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
    errors.push('Order ID is required');
  }

  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
    errors.push('Payment ID is required');
  }

  if (!razorpay_signature || typeof razorpay_signature !== 'string') {
    errors.push('Payment signature is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
}

// Validate create order input
function validateCreateOrder(req, res, next) {
  const { userId, plan } = req.body;
  const errors = [];

  if (!userId || typeof userId !== 'string') {
    errors.push('User ID is required');
  }

  const validPlans = ['bharat', 'pro', 'global'];
  if (!plan || !validPlans.includes(plan)) {
    errors.push('Please select a valid plan (bharat, pro, or global)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
}

module.exports = {
  validateRegistration,
  validatePaymentVerification,
  validateCreateOrder
};
