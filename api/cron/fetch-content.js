require('dotenv').config();
const { fetchAllContent } = require('../../services/content/fetcher');

/**
 * Cron endpoint to fetch content from all sources
 * Triggered every 4 hours by Vercel Cron
 *
 * Schedule: 0 */4 * * * (every 4 hours)
 */
module.exports = async (req, res) => {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Starting content fetch cron job...');
  const startTime = Date.now();

  try {
    const results = await fetchAllContent();

    const response = {
      success: results.success,
      message: 'Content fetch completed',
      stats: {
        sourcesProcessed: results.sourcesProcessed,
        itemsFetched: results.itemsFetched,
        itemsAdded: results.itemsAdded,
        duration: `${results.duration}ms`
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
      timestamp: new Date().toISOString()
    };

    console.log('Content fetch completed:', response);

    // Return 200 even with partial failures to prevent Vercel from retrying
    return res.status(200).json(response);

  } catch (error) {
    console.error('Content fetch cron error:', error);

    return res.status(500).json({
      success: false,
      error: 'Content fetch failed',
      message: error.message,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
};
