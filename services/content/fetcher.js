const { parseMultipleFeeds, parseFeed } = require('./rss-parser');
const { filterAndDedupe, enrichContent } = require('./categorizer');
const { getActiveSources, RSS_SOURCES } = require('./sources');
const { contentQueries, contentSourceQueries } = require('../../lib/supabase');

/**
 * Main content fetcher - orchestrates fetching from all sources
 * @param {Object} options - Fetch options
 * @returns {Object} Fetch results summary
 */
async function fetchAllContent(options = {}) {
  const startTime = Date.now();
  const results = {
    success: true,
    sourcesProcessed: 0,
    itemsFetched: 0,
    itemsAdded: 0,
    errors: [],
    duration: 0
  };

  try {
    // Get active sources from database or fallback to config
    let sources;
    try {
      sources = await contentSourceQueries.getActive();
      if (!sources || sources.length === 0) {
        console.log('No sources in database, using config sources');
        sources = getActiveSources();
      }
    } catch (error) {
      console.log('Database unavailable, using config sources:', error.message);
      sources = getActiveSources();
    }

    console.log(`Fetching content from ${sources.length} sources...`);
    results.sourcesProcessed = sources.length;

    // Fetch all feeds in parallel
    const allItems = await parseMultipleFeeds(sources);
    results.itemsFetched = allItems.length;
    console.log(`Fetched ${allItems.length} items total`);

    if (allItems.length === 0) {
      console.log('No items fetched from any source');
      results.duration = Date.now() - startTime;
      return results;
    }

    // Get recent existing items for deduplication
    let existingItems = [];
    try {
      existingItems = await contentQueries.getRecent(null, 200);
    } catch (error) {
      console.log('Could not fetch existing items for deduplication:', error.message);
    }

    // Filter and deduplicate
    const uniqueItems = filterAndDedupe(allItems, existingItems);
    console.log(`${uniqueItems.length} unique new items after deduplication`);

    if (uniqueItems.length === 0) {
      console.log('No new unique items to add');
      results.duration = Date.now() - startTime;
      return results;
    }

    // Insert new items in batches
    try {
      const inserted = await contentQueries.createMany(uniqueItems);
      results.itemsAdded = inserted.length;
      console.log(`Added ${inserted.length} new items to database`);
    } catch (error) {
      console.error('Error inserting items:', error.message);
      results.errors.push(`Insert error: ${error.message}`);
      results.success = false;
    }

    // Update last_fetched timestamp for sources
    for (const source of sources) {
      if (source.id) {
        try {
          await contentSourceQueries.updateLastFetched(source.id);
        } catch (error) {
          // Non-critical error, continue
        }
      }
    }

  } catch (error) {
    console.error('Fetch error:', error);
    results.errors.push(error.message);
    results.success = false;
  }

  results.duration = Date.now() - startTime;
  console.log(`Fetch completed in ${results.duration}ms`);

  return results;
}

/**
 * Fetch content from a single source
 * @param {Object} source - Source configuration
 * @returns {Object} Fetch result
 */
async function fetchSingleSource(source) {
  const results = {
    source: source.name,
    itemsFetched: 0,
    itemsAdded: 0,
    errors: []
  };

  try {
    const items = await parseFeed(source.feed_url, source);
    results.itemsFetched = items.length;

    if (items.length === 0) {
      return results;
    }

    // Get existing for deduplication
    let existingItems = [];
    try {
      existingItems = await contentQueries.getRecent(source.category, 50);
    } catch (error) {
      console.log('Could not fetch existing items:', error.message);
    }

    const uniqueItems = filterAndDedupe(items, existingItems);

    if (uniqueItems.length > 0) {
      try {
        const inserted = await contentQueries.createMany(uniqueItems);
        results.itemsAdded = inserted.length;
      } catch (error) {
        results.errors.push(error.message);
      }
    }

    // Update last_fetched
    if (source.id) {
      try {
        await contentSourceQueries.updateLastFetched(source.id);
      } catch (error) {
        // Non-critical
      }
    }

  } catch (error) {
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Fetch content by category
 * @param {string} category - Category to fetch
 * @returns {Object} Fetch results
 */
async function fetchByCategory(category) {
  const sources = RSS_SOURCES.filter(s => s.category === category);

  if (sources.length === 0) {
    return { error: `No sources found for category: ${category}` };
  }

  const results = {
    category,
    sourcesProcessed: sources.length,
    totalFetched: 0,
    totalAdded: 0,
    sourceResults: []
  };

  for (const source of sources) {
    const result = await fetchSingleSource(source);
    results.sourceResults.push(result);
    results.totalFetched += result.itemsFetched;
    results.totalAdded += result.itemsAdded;
  }

  return results;
}

/**
 * Initialize content sources in database
 * Seeds the content_sources table with RSS_SOURCES config
 */
async function initializeSources() {
  console.log('Initializing content sources...');

  for (const source of RSS_SOURCES) {
    try {
      // Check if source already exists
      const existing = await contentSourceQueries.getActive();
      const exists = existing.some(s => s.feed_url === source.feed_url);

      if (!exists) {
        await contentSourceQueries.create({
          name: source.name,
          category: source.category,
          source_type: source.source_type,
          feed_url: source.feed_url,
          is_active: true
        });
        console.log(`Added source: ${source.name}`);
      }
    } catch (error) {
      console.error(`Error adding source ${source.name}:`, error.message);
    }
  }

  console.log('Source initialization complete');
}

/**
 * Get fetch statistics
 * @returns {Object} Statistics about content fetching
 */
async function getFetchStats() {
  try {
    const sources = await contentSourceQueries.getActive();
    const recentContent = await contentQueries.getRecent(null, 100);

    const stats = {
      totalSources: sources.length,
      sourcesByCategory: {},
      recentItems: recentContent.length,
      lastFetchTimes: {}
    };

    for (const source of sources) {
      // Count by category
      stats.sourcesByCategory[source.category] = (stats.sourcesByCategory[source.category] || 0) + 1;

      // Track last fetch times
      if (source.last_fetched) {
        stats.lastFetchTimes[source.name] = source.last_fetched;
      }
    }

    return stats;

  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  fetchAllContent,
  fetchSingleSource,
  fetchByCategory,
  initializeSources,
  getFetchStats
};
