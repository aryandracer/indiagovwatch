require('dotenv').config();
const { contentQueries, preferencesQueries } = require('../../lib/supabase');
const { authenticateRequest } = require('../../middleware/auth');
const { buildDigestPreview } = require('../../services/notifications/digest-builder');
const { CATEGORIES } = require('../../services/content/sources');

/**
 * Get preview of today's digest for the authenticated user
 *
 * GET /api/user/digest-preview - Get digest preview
 *
 * Query params:
 * - category: Filter by specific category (optional)
 * - limit: Number of items to return (default: 30, max: 50)
 *
 * Headers: Authorization: Bearer <token>
 */
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    // Parse query params
    const { category, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam) || 30, 50);

    // Get user preferences
    let preferences;
    try {
      preferences = await preferencesQueries.get(auth.userId);
    } catch (error) {
      console.error('Error fetching preferences:', error.message);
    }

    // Use defaults if no preferences
    let categories = preferences?.categories || Object.keys(CATEGORIES);
    const states = preferences?.states || [];
    const keywords = preferences?.keywords || [];

    // If specific category requested, filter to just that
    if (category && Object.keys(CATEGORIES).includes(category)) {
      categories = [category];
    }

    // Get content matching preferences
    const content = await contentQueries.getUnsentForUser(
      categories,
      states,
      keywords,
      limit
    );

    // Build preview data
    const preview = buildDigestPreview(content);

    // Format for response
    return res.status(200).json({
      success: true,
      preview: {
        totalItems: preview.totalItems,
        categories: preview.categories,
        topItems: preview.topItems
      },
      content: content.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description?.substring(0, 200),
        url: item.url,
        category: item.category,
        categoryName: CATEGORIES[item.category]?.name || item.category,
        state: item.state,
        publishedAt: item.published_at,
        tags: item.tags
      })),
      filters: {
        categories,
        states,
        keywords
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Digest preview API error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.'
    });
  }
};
