const { CATEGORIES, STATES, GOVERNMENT_KEYWORDS, isGovernmentRelated } = require('./sources');

/**
 * Auto-categorize content based on title and description keywords
 * @param {Object} item - Content item with title and description
 * @returns {string} Best matching category
 */
function categorizeContent(item) {
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();

  // Score each category based on keyword matches
  const scores = {};

  for (const [category, config] of Object.entries(CATEGORIES)) {
    scores[category] = 0;

    for (const keyword of config.keywords) {
      // Count occurrences of each keyword
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        scores[category] += matches.length;
      }
    }
  }

  // Find category with highest score
  let bestCategory = 'policy'; // Default fallback
  let highestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Detect state from content text
 * @param {Object} item - Content item
 * @returns {string|null} Detected state or null for national
 */
function detectState(item) {
  const text = `${item.title || ''} ${item.description || ''}`;

  for (const state of STATES) {
    // Check for state name in text
    const regex = new RegExp(`\\b${state}\\b`, 'i');
    if (regex.test(text)) {
      return state;
    }
  }

  // Check for common state abbreviations
  const stateAbbreviations = {
    'MH': 'Maharashtra',
    'KA': 'Karnataka',
    'TN': 'Tamil Nadu',
    'AP': 'Andhra Pradesh',
    'TS': 'Telangana',
    'UP': 'Uttar Pradesh',
    'MP': 'Madhya Pradesh',
    'RJ': 'Rajasthan',
    'GJ': 'Gujarat',
    'WB': 'West Bengal',
    'BR': 'Bihar',
    'JH': 'Jharkhand',
    'OD': 'Odisha',
    'CG': 'Chhattisgarh',
    'KL': 'Kerala',
    'PB': 'Punjab',
    'HR': 'Haryana',
    'UK': 'Uttarakhand',
    'HP': 'Himachal Pradesh',
    'JK': 'Jammu and Kashmir',
    'GA': 'Goa',
    'AS': 'Assam',
    'DL': 'Delhi'
  };

  for (const [abbr, state] of Object.entries(stateAbbreviations)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    if (regex.test(text)) {
      return state;
    }
  }

  return null; // National level
}

/**
 * Extract relevant tags from content
 * @param {Object} item - Content item
 * @returns {string[]} Array of tags
 */
function extractTags(item) {
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  const tags = new Set();

  // Add existing tags if present
  if (item.tags && Array.isArray(item.tags)) {
    item.tags.forEach(tag => tags.add(tag.toLowerCase()));
  }

  // Ministry/Department detection
  const ministries = [
    'finance', 'home', 'defence', 'external affairs', 'agriculture',
    'health', 'education', 'commerce', 'railways', 'telecom',
    'it', 'law', 'labour', 'environment', 'power', 'urban',
    'rural', 'women', 'child', 'social justice', 'tribal',
    'minority', 'science', 'technology', 'space', 'atomic'
  ];

  ministries.forEach(ministry => {
    if (text.includes(ministry)) {
      tags.add(ministry);
    }
  });

  // Common government terms
  const govTerms = [
    'central', 'state', 'district', 'panchayat', 'municipal',
    'budget', 'allocation', 'amendment', 'notification', 'order',
    'deadline', 'application', 'eligibility', 'benefit', 'subsidy'
  ];

  govTerms.forEach(term => {
    if (text.includes(term)) {
      tags.add(term);
    }
  });

  return Array.from(tags).slice(0, 10); // Limit to 10 tags
}

/**
 * Check if content is duplicate based on URL or similar title
 * @param {Object} newItem - New content item
 * @param {Array} existingItems - Existing content items
 * @returns {boolean} True if duplicate
 */
function isDuplicate(newItem, existingItems) {
  // Check URL match
  if (newItem.url) {
    const urlMatch = existingItems.find(item => item.url === newItem.url);
    if (urlMatch) return true;
  }

  // Check similar title (>90% match)
  const newTitle = newItem.title?.toLowerCase().trim();
  if (!newTitle) return false;

  for (const item of existingItems) {
    const existingTitle = item.title?.toLowerCase().trim();
    if (!existingTitle) continue;

    const similarity = calculateSimilarity(newTitle, existingTitle);
    if (similarity > 0.9) return true;
  }

  return false;
}

/**
 * Calculate string similarity (Jaccard index on words)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score 0-1
 */
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Enrich content item with auto-detected metadata
 * @param {Object} item - Raw content item
 * @returns {Object} Enriched content item
 */
function enrichContent(item) {
  return {
    ...item,
    category: item.category || categorizeContent(item),
    state: item.state || detectState(item),
    tags: extractTags(item)
  };
}

/**
 * Filter and deduplicate content items
 * @param {Array} newItems - New items to filter
 * @param {Array} existingItems - Existing items for deduplication
 * @param {Object} options - Filter options
 * @returns {Array} Filtered unique items
 */
function filterAndDedupe(newItems, existingItems = [], options = {}) {
  const unique = [];
  const seen = new Set(existingItems.map(i => i.url).filter(Boolean));
  const { filterForGovernment = true } = options;

  for (const item of newItems) {
    // Skip if no title
    if (!item.title || item.title.trim() === '') continue;

    // Skip if URL already seen
    if (item.url && seen.has(item.url)) continue;

    // Skip if duplicate of existing
    if (isDuplicate(item, [...existingItems, ...unique])) continue;

    // Filter news content for government relevance (skip for job/scheme sources)
    if (filterForGovernment && item.category === 'policy') {
      if (!isGovernmentRelated(item)) {
        continue;
      }
    }

    // Enrich and add
    const enriched = enrichContent(item);
    unique.push(enriched);

    if (item.url) seen.add(item.url);
  }

  return unique;
}

module.exports = {
  categorizeContent,
  detectState,
  extractTags,
  isDuplicate,
  enrichContent,
  filterAndDedupe
};
