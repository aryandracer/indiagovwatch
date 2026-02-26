require('dotenv').config();
const { userQueries, subscriptionQueries } = require('../../lib/supabase');
const { authenticateRequest } = require('../../middleware/auth');

/**
 * Get/Update user profile
 *
 * GET /api/user/profile - Get current user's profile
 * PUT /api/user/profile - Update profile (name, phone, language)
 *
 * Headers: Authorization: Bearer <token>
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    if (req.method === 'GET') {
      // Get user profile
      const user = await userQueries.findById(auth.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get subscription
      let subscription = null;
      try {
        subscription = await subscriptionQueries.findByUserId(user.id);
      } catch (error) {
        console.error('Error fetching subscription:', error.message);
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          language: user.language,
          createdAt: user.created_at
        },
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          startDate: subscription.start_date,
          endDate: subscription.end_date
        } : null
      });

    } else if (req.method === 'PUT') {
      // Update user profile
      const { name, phone, language } = req.body;
      const updates = {};

      // Validate and add updates
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 2) {
          return res.status(400).json({
            success: false,
            error: 'Name must be at least 2 characters'
          });
        }
        updates.name = name.trim();
      }

      if (phone !== undefined) {
        if (phone && typeof phone === 'string') {
          const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
          if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
            return res.status(400).json({
              success: false,
              error: 'Please provide a valid phone number'
            });
          }
          updates.phone = cleanPhone;
        } else {
          updates.phone = null;
        }
      }

      if (language !== undefined) {
        const validLanguages = [
          'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu',
          'Marathi', 'Kannada', 'Gujarati', 'Malayalam', 'Punjabi'
        ];
        if (!validLanguages.includes(language)) {
          return res.status(400).json({
            success: false,
            error: 'Please select a valid language'
          });
        }
        updates.language = language;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      // Update user
      const updatedUser = await userQueries.update(auth.userId, updates);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          language: updatedUser.language
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};
