require('dotenv').config();
const { contentQueries } = require('../../lib/supabase');

const categoryNames = {
  schemes: 'Schemes',
  jobs: 'Jobs',
  policy: 'Policy',
  tenders: 'Tenders',
  rti: 'RTI'
};

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
    const content = await contentQueries.getRecent(null, 50);

    const categories = {
      schemes: { count: content.filter(c => c.category === 'schemes').length },
      jobs: { count: content.filter(c => c.category === 'jobs').length },
      policy: { count: content.filter(c => c.category === 'policy').length },
      tenders: { count: content.filter(c => c.category === 'tenders').length },
      rti: { count: content.filter(c => c.category === 'rti').length }
    };

    return res.status(200).json({
      success: true,
      preview: {
        totalItems: content.length,
        categories
      },
      content: content.slice(0, 15).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        categoryName: categoryNames[item.category] || item.category,
        url: item.url,
        state: item.state,
        publishedAt: item.published_at
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
