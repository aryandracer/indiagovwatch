require('dotenv').config();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Test 1: Basic response
    const results = { tests: [] };
    results.tests.push({ name: 'basic', status: 'ok' });

    // Test 2: Check environment
    results.tests.push({
      name: 'env',
      supabase: !!process.env.SUPABASE_URL,
      cron: !!process.env.CRON_SECRET
    });

    // Test 3: Import modules
    try {
      const { getActiveSources } = require('../services/content/sources');
      const sources = getActiveSources();
      results.tests.push({ name: 'sources', count: sources.length });
    } catch (e) {
      results.tests.push({ name: 'sources', error: e.message });
    }

    // Test 4: RSS Parser
    try {
      const { parseFeed } = require('../services/content/rss-parser');
      const items = await parseFeed('https://www.mygov.in/rss.xml', { name: 'test', category: 'schemes' });
      results.tests.push({ name: 'rss', items: items.length });
    } catch (e) {
      results.tests.push({ name: 'rss', error: e.message });
    }

    // Test 5: Database
    try {
      const { contentQueries } = require('../lib/supabase');
      const recent = await contentQueries.getRecent(null, 5);
      results.tests.push({ name: 'db', items: recent.length });
    } catch (e) {
      results.tests.push({ name: 'db', error: e.message });
    }

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
};
