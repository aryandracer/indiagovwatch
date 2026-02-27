require('dotenv').config();
const jwt = require('jsonwebtoken');
const { contentQueries } = require('../../lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get recent content from database
    const content = await contentQueries.getRecent(null, 20);

    // Group by category and count
    const stats = {
      total: content.length,
      schemes: content.filter(c => c.category === 'schemes').length,
      jobs: content.filter(c => c.category === 'jobs').length,
      policy: content.filter(c => c.category === 'policy').length,
      tenders: content.filter(c => c.category === 'tenders').length,
      rti: content.filter(c => c.category === 'rti').length
    };

    return res.status(200).json({
      success: true,
      stats,
      items: content.slice(0, 10).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        url: item.url,
        state: item.state,
        published_at: item.published_at
      }))
    });

  } catch (error) {
    console.error('Digest preview error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to load digest'
    });
  }
};
