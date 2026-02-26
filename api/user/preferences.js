require('dotenv').config();
const { preferencesQueries } = require('../../lib/supabase');
const { authenticateRequest } = require('../../middleware/auth');
const { CATEGORIES, STATES } = require('../../services/content/sources');

/**
 * Get/Update user preferences for content digest
 *
 * GET /api/user/preferences - Get current preferences
 * PUT /api/user/preferences - Update preferences
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
      // Get user preferences
      let preferences;
      try {
        preferences = await preferencesQueries.get(auth.userId);
      } catch (error) {
        console.error('Error fetching preferences:', error.message);
      }

      // Return default preferences if none exist
      if (!preferences) {
        preferences = {
          categories: Object.keys(CATEGORIES),
          states: [],
          keywords: [],
          digest_time: '08:00'
        };
      }

      return res.status(200).json({
        success: true,
        preferences: {
          categories: preferences.categories || Object.keys(CATEGORIES),
          states: preferences.states || [],
          keywords: preferences.keywords || [],
          digestTime: preferences.digest_time || '08:00'
        },
        // Include available options for UI
        options: {
          categories: Object.entries(CATEGORIES).map(([key, value]) => ({
            id: key,
            name: value.name,
            description: value.description
          })),
          states: STATES
        }
      });

    } else if (req.method === 'PUT') {
      // Update user preferences
      const { categories, states, keywords, digestTime } = req.body;
      const updates = {};

      // Validate categories
      if (categories !== undefined) {
        if (!Array.isArray(categories)) {
          return res.status(400).json({
            success: false,
            error: 'Categories must be an array'
          });
        }

        const validCategories = Object.keys(CATEGORIES);
        const filteredCategories = categories.filter(c => validCategories.includes(c));

        if (filteredCategories.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Please select at least one category'
          });
        }

        updates.categories = filteredCategories;
      }

      // Validate states
      if (states !== undefined) {
        if (!Array.isArray(states)) {
          return res.status(400).json({
            success: false,
            error: 'States must be an array'
          });
        }

        // Filter to valid states (empty array means all states)
        const filteredStates = states.filter(s => STATES.includes(s));
        updates.states = filteredStates;
      }

      // Validate keywords
      if (keywords !== undefined) {
        if (!Array.isArray(keywords)) {
          return res.status(400).json({
            success: false,
            error: 'Keywords must be an array'
          });
        }

        // Clean and limit keywords
        const cleanedKeywords = keywords
          .filter(k => typeof k === 'string' && k.trim().length > 0)
          .map(k => k.trim().toLowerCase())
          .slice(0, 20); // Max 20 keywords

        updates.keywords = cleanedKeywords;
      }

      // Validate digest time
      if (digestTime !== undefined) {
        if (typeof digestTime !== 'string' || !/^\d{2}:\d{2}$/.test(digestTime)) {
          return res.status(400).json({
            success: false,
            error: 'Digest time must be in HH:MM format'
          });
        }

        const [hours, minutes] = digestTime.split(':').map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return res.status(400).json({
            success: false,
            error: 'Invalid time format'
          });
        }

        updates.digest_time = digestTime;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      // Upsert preferences
      const updatedPrefs = await preferencesQueries.upsert(auth.userId, updates);

      return res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: {
          categories: updatedPrefs.categories,
          states: updatedPrefs.states,
          keywords: updatedPrefs.keywords,
          digestTime: updatedPrefs.digest_time
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Preferences API error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};
