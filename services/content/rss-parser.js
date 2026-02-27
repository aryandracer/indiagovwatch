const Parser = require('rss-parser');

// Official government website mappings
const OFFICIAL_PORTALS = {
  // Central Government
  'upsc': 'https://upsc.gov.in',
  'ssc': 'https://ssc.nic.in',
  'ibps': 'https://ibps.in',
  'rrb': 'https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,7,1281',
  'railway': 'https://indianrailways.gov.in',
  'drdo': 'https://drdo.gov.in',
  'isro': 'https://isro.gov.in',
  'ongc': 'https://ongcindia.com',
  'bhel': 'https://bhel.com',
  'sail': 'https://sail.co.in',
  'ntpc': 'https://ntpc.co.in',
  'iocl': 'https://iocl.com',
  'hal': 'https://hal-india.co.in',
  'bel': 'https://bel-india.in',
  'gail': 'https://gailonline.com',
  'eil': 'https://engineersindia.com',
  'npcil': 'https://npcil.nic.in',
  'bpcl': 'https://bharatpetroleum.in',
  'hpcl': 'https://hindustanpetroleum.com',

  // Banks
  'sbi': 'https://sbi.co.in/careers',
  'rbi': 'https://rbi.org.in',
  'pnb': 'https://pnbindia.in',
  'bob': 'https://bankofbaroda.in',
  'canara': 'https://canarabank.com',

  // Universities & Education
  'ugc': 'https://ugc.ac.in',
  'iit': 'https://iitsystem.ac.in',
  'nit': 'https://nitcouncil.org.in',
  'aiims': 'https://aiims.edu',
  'jnu': 'https://jnu.ac.in',
  'du': 'https://du.ac.in',
  'bhu': 'https://bhu.ac.in',
  'amu': 'https://amu.ac.in',
  'anna university': 'https://annauniv.edu',
  'iim': 'https://iim.ac.in',

  // Defence
  'indian army': 'https://joinindianarmy.nic.in',
  'indian navy': 'https://joinindiannavy.gov.in',
  'indian air force': 'https://indianairforce.nic.in',
  'coast guard': 'https://joinindiancoastguard.cdac.in',

  // States
  'dsssb': 'https://dsssb.delhi.gov.in',
  'uppsc': 'https://uppsc.up.nic.in',
  'bpsc': 'https://bpsc.bih.nic.in',
  'mpsc': 'https://mpsc.gov.in',
  'tnpsc': 'https://tnpsc.gov.in',
  'kpsc': 'https://kpsc.kar.nic.in',
  'appsc': 'https://psc.ap.gov.in',
  'tspsc': 'https://tspsc.gov.in',
  'rpsc': 'https://rpsc.rajasthan.gov.in',
  'gpsc': 'https://gpsc.gujarat.gov.in',
  'wbpsc': 'https://wbpsc.gov.in',
  'mppsc': 'https://mppsc.nic.in',
  'cgpsc': 'https://psc.cg.gov.in',
  'ukpsc': 'https://ukpsc.gov.in',
  'hppsc': 'https://hppsc.hp.gov.in',
  'jpsc': 'https://jpsc.gov.in',
  'opsc': 'https://opsc.gov.in',
  'ppsc': 'https://ppsc.gov.in',
  'hpsc': 'https://hpsc.gov.in',

  // Research
  'csir': 'https://csir.res.in',
  'icar': 'https://icar.org.in',
  'icmr': 'https://icmr.nic.in',
  'dae': 'https://dae.gov.in',
  'dst': 'https://dst.gov.in',

  // Others
  'lic': 'https://licindia.in',
  'fci': 'https://fci.gov.in',
  'nhai': 'https://nhai.gov.in',
  'aai': 'https://aai.aero',
  'bsnl': 'https://bsnl.co.in',
  'mtnl': 'https://mtnl.in',
  'ecil': 'https://ecil.co.in',
  'becil': 'https://becil.com',
  'nielit': 'https://nielit.gov.in',
  'nift': 'https://nift.ac.in',
};

/**
 * Extract official URL from title/description
 * Uses word boundary matching to avoid false positives
 */
function getOfficialUrl(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Sort by key length (longer first) to match more specific terms first
  const sortedPortals = Object.entries(OFFICIAL_PORTALS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, url] of sortedPortals) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${key.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return url;
    }
  }

  // Check for IIT pattern (e.g., "IIT Madras", "IIT Delhi")
  const iitMatch = text.match(/\biit\s+(\w+)/i);
  if (iitMatch) {
    return `https://www.iit${iitMatch[1].toLowerCase()}.ac.in`;
  }

  // Check for NIT pattern
  const nitMatch = text.match(/\bnit\s+(\w+)/i);
  if (nitMatch) {
    return `https://www.nit${nitMatch[1].toLowerCase()}.ac.in`;
  }

  return null;
}

// Initialize RSS parser with custom fields
const parser = new Parser({
  timeout: 5000, // 5 second timeout per feed
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

  // Get official portal URL
  const officialUrl = getOfficialUrl(title, description);

  return {
    source_id: sourceInfo.id || null,
    category: sourceInfo.category || 'policy',
    title: title,
    description: description,
    url: officialUrl || item.link || item.guid || null, // Prefer official URL
    original_url: item.link || item.guid || null, // Keep aggregator URL as backup
    official_url: officialUrl,
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
