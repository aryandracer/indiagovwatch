const jwt = require('jsonwebtoken');
const { userQueries } = require('../lib/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with id and email
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token and return decoded payload
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Express middleware to authenticate requests
 * Expects: Authorization: Bearer <token>
 * Sets: req.user with user data
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'No authorization header provided'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authorization format. Use: Bearer <token>'
    });
  }

  const token = parts[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  // Attach user info to request
  req.user = {
    userId: decoded.userId,
    email: decoded.email
  };

  next();
}

/**
 * Async middleware for serverless functions
 * Returns user object or null
 * @param {Object} req - Request object
 * @returns {Object|null} User info or null
 */
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return null;
  }

  return {
    userId: decoded.userId,
    email: decoded.email
  };
}

/**
 * Get full user data from token
 * Fetches user from database to ensure they still exist and are active
 * @param {Object} req - Request object
 * @returns {Object|null} Full user object or null
 */
async function getAuthenticatedUser(req) {
  const auth = await authenticateRequest(req);

  if (!auth) {
    return null;
  }

  try {
    const user = await userQueries.findById(auth.userId);
    return user;
  } catch (error) {
    console.error('Error fetching authenticated user:', error.message);
    return null;
  }
}

/**
 * Generate OTP code
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get OTP expiration time
 * @param {number} minutes - Minutes until expiration (default: 10)
 * @returns {string} ISO timestamp
 */
function getOTPExpiry(minutes = 10) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry.toISOString();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authenticateRequest,
  getAuthenticatedUser,
  generateOTP,
  getOTPExpiry,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
