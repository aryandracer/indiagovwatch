require('dotenv').config();
const { parseFeed } = require('../../services/content/rss-parser');
const { filterAndDedupe } = require('../../services/content/categorizer');
const { getActiveSources } = require('../../services/content/sources');
const { contentQueries } = require('../../lib/supabase');

/**
 * Cron endpoint to fetch content - optimized for Vercel 10s timeout
 */
module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const results = { sources: 0, fetched: 0, added: 0, errors: [] };

  try {
    const sources = getActiveSources().slice(0, 4); // Limit to 4 sources for speed
    results.sources = sources.length;

    // Fetch feeds sequentially with timeout protection
    const allItems = [];
    for (const source of sources) {
      if (Date.now() - startTime > 7000) break; // Stop if approaching timeout

      try {
        const items = await parseFeed(source.feed_url, source);
        allItems.push(...items);
      } catch (e) {
        results.errors.push(`${source.name}: ${e.message}`);
      }
    }
    results.fetched = allItems.length;

    if (allItems.length > 0) {
      // Get existing for deduplication
      const existing = await contentQueries.getRecent(null, 100);
      const unique = filterAndDedupe(allItems, existing);

      if (unique.length > 0) {
        const inserted = await contentQueries.createMany(unique);
        results.added = inserted.length;
      }
    }

    return res.status(200).json({
      success: true,
      ...results,
      duration: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    return res.status(200).json({
      success: false,
      error: error.message,
      ...results,
      duration: `${Date.now() - startTime}ms`
    });
  }
};
