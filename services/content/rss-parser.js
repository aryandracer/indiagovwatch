const Parser = require('rss-parser');

// Initialize RSS parser with custom fields
const parser = new Parser({
  timeout: 30000, // 30 second timeout
  headers: {
    'User-Agent': 'IndiaGovWatch/1.0 (+https://indiagovwatch.in)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    feed: ['language', 'lastBuildDate'],
    item: [
      ['dc:creator', 'creator'],
      ['content:encoded', 'contentEncoded'],
      ['dc:date', 'dcDate'],
      ['category', 'categories', { keepArray: true }]
    ]
  }
});

/**
 * Parse an RSS feed and return normalized items
 * @param {string} feedUrl - URL of the RSS feed
 * @param {Object} sourceInfo - Source metadata (category, state, etc.)
 * @returns {Array} Normalized content items
 */
async function parseFeed(feedUrl, sourceInfo = {}) {
  try {
    const feed = await parser.parseURL(feedUrl);

    if (!feed || !feed.items) {
      console.log(`No items found in feed: ${feedUrl}`);
      return [];
    }

    const items = feed.items.map(item => normalizeItem(item, sourceInfo, feed));

    console.log(`Parsed ${items.length} items from ${sourceInfo.name || feedUrl}`);
    return items;

  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error.message);
    return [];
  }
}

/**
 * Normalize a feed item to our content schema
 * @param {Object} item - Raw RSS item
 * @param {Object} sourceInfo - Source metadata
 * @param {Object} feed - Parent feed object
 * @returns {Object} Normalized content item
 */
function normalizeItem(item, sourceInfo, feed) {
  // Extract publication date
  let publishedAt = null;
  if (item.pubDate) {
    publishedAt = new Date(item.pubDate).toISOString();
  } else if (item.isoDate) {
    publishedAt = item.isoDate;
  } else if (item.dcDate) {
    publishedAt = new Date(item.dcDate).toISOString();
  }

  // Clean and truncate description
  let description = item.contentSnippet || item.content || item.summary || '';
  description = cleanText(description);
  if (description.length > 1000) {
    description = description.substring(0, 997) + '...';
  }

  // Extract tags from categories
  const tags = [];
  if (item.categories && Array.isArray(item.categories)) {
    tags.push(...item.categories.map(c => typeof c === 'string' ? c : c._ || c));
  }

  // Clean title
  const title = cleanText(item.title || 'Untitled');

  return {
    source_id: sourceInfo.id || null,
    category: sourceInfo.category || 'policy',
    title: title,
    description: description,
    url: item.link || item.guid || null,
    published_at: publishedAt,
    state: sourceInfo.state || null,
    tags: tags.length > 0 ? tags : null,
    is_sent: false
  };
}

/**
 * Clean text by removing HTML tags and extra whitespace
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
function cleanText(text) {
  if (!text) return '';

  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse multiple feeds in parallel
 * @param {Array} sources - Array of source configs
 * @returns {Array} All parsed items
 */
async function parseMultipleFeeds(sources) {
  const results = await Promise.allSettled(
    sources.map(source => parseFeed(source.feed_url, source))
  );

  const allItems = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      console.error(`Failed to parse ${sources[index].name}:`, result.reason);
    }
  });

  return allItems;
}

/**
 * Validate if a URL is a valid RSS feed
 * @param {string} feedUrl - URL to validate
 * @returns {Object} Validation result with feed info
 */
async function validateFeed(feedUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);
    return {
      valid: true,
      title: feed.title,
      description: feed.description,
      itemCount: feed.items?.length || 0,
      lastBuildDate: feed.lastBuildDate
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

module.exports = {
  parseFeed,
  parseMultipleFeeds,
  validateFeed,
  cleanText
};
