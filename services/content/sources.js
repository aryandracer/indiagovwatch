// Government content sources configuration
// TESTED AND VERIFIED - Only includes feeds that actually work

const RSS_SOURCES = [
  // ===============================================
  // JOBS - Government Job Alerts
  // ===============================================
  {
    name: 'FreeJobAlert',
    category: 'jobs',
    source_type: 'rss',
    feed_url: 'https://www.freejobalert.com/feed/',
    state: null,
    priority: 1,
    description: 'Latest government job notifications'
  },

  // ===============================================
  // POLICY - Government & News Sources
  // ===============================================
  {
    name: 'Hindustan Times - India',
    category: 'policy',
    source_type: 'rss',
    feed_url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    state: null,
    priority: 1,
    description: 'National news and policy coverage'
  },
  {
    name: 'NDTV India News',
    category: 'policy',
    source_type: 'rss',
    feed_url: 'https://feeds.feedburner.com/ndtvnews-india-news',
    state: null,
    priority: 2,
    description: 'India news coverage'
  },
  {
    name: 'Times of India - Politics',
    category: 'policy',
    source_type: 'rss',
    feed_url: 'https://timesofindia.indiatimes.com/rssfeeds/1221656.cms',
    state: null,
    priority: 2,
    description: 'Political news and government updates'
  },
  {
    name: 'NITI Aayog',
    category: 'policy',
    source_type: 'rss',
    feed_url: 'https://niti.gov.in/rss.xml',
    state: null,
    priority: 1,
    description: 'Policy think tank releases'
  },
  // Removed PIB Finance Ministry (returns 403 from Vercel IPs)

  // ===============================================
  // SCHEMES - Welfare & Citizen Services
  // ===============================================
  {
    name: 'MyGov India',
    category: 'schemes',
    source_type: 'rss',
    feed_url: 'https://www.mygov.in/rss.xml',
    state: null,
    priority: 1,
    description: 'Citizen engagement and schemes'
  },

  // ===============================================
  // NEWS - Filtered for Government Keywords
  // ===============================================
  // Removed Business Standard (returns 403)
  // Removed Livemint (slow response)
  // Removed PIB Finance (returns 403)
];

// Category definitions with keywords for filtering
const CATEGORIES = {
  schemes: {
    name: 'Government Schemes',
    description: 'Welfare schemes, subsidies, and benefits',
    keywords: ['scheme', 'yojana', 'benefit', 'subsidy', 'welfare', 'grant', 'assistance', 'pm-', 'pradhan mantri', 'ayushman', 'ujjwala', 'mudra', 'kisan']
  },
  jobs: {
    name: 'Government Jobs',
    description: 'Recruitment notifications and job openings',
    keywords: ['recruitment', 'vacancy', 'job', 'appointment', 'bharti', 'exam', 'post', 'sarkari', 'upsc', 'ssc', 'ibps', 'railway', 'staff selection', 'public service']
  },
  tenders: {
    name: 'Tenders',
    description: 'Government procurement and tender notices',
    keywords: ['tender', 'bid', 'procurement', 'contract', 'quotation', 'rfp', 'eoi', 'gem', 'e-procurement']
  },
  rti: {
    name: 'RTI Updates',
    description: 'Right to Information updates and decisions',
    keywords: ['rti', 'right to information', 'disclosure', 'transparency', 'public authority', 'information commission']
  },
  policy: {
    name: 'Policy & Orders',
    description: 'Government orders, circulars, and policy updates',
    keywords: ['order', 'circular', 'notification', 'gazette', 'amendment', 'act', 'rule', 'policy', 'cabinet', 'parliament', 'budget', 'ministry', 'government']
  }
};

// Indian states list for filtering
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

// Keywords to filter government-related content from news feeds
const GOVERNMENT_KEYWORDS = [
  // Government bodies
  'government', 'cabinet', 'ministry', 'parliament', 'lok sabha', 'rajya sabha',
  'supreme court', 'high court', 'pmo', 'prime minister', 'cm ', 'chief minister',

  // Schemes and programs
  'scheme', 'yojana', 'mission', 'programme', 'initiative', 'welfare',

  // Jobs
  'recruitment', 'vacancy', 'upsc', 'ssc', 'exam', 'result',

  // Policy
  'policy', 'bill', 'act', 'amendment', 'notification', 'circular', 'order',
  'budget', 'tax', 'gst', 'rbi', 'sebi',

  // Departments
  'railway', 'defence', 'education', 'health', 'agriculture', 'finance'
];

// Filter news items for government relevance
const isGovernmentRelated = (item) => {
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  return GOVERNMENT_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
};

// Get all active RSS sources
const getActiveSources = () => {
  return RSS_SOURCES.filter(s => s.source_type === 'rss');
};

// Get sources by category
const getSourcesByCategory = (category) => {
  return RSS_SOURCES.filter(s => s.category === category);
};

// Get sources by priority (1 = highest)
const getSourcesByPriority = (priority) => {
  return RSS_SOURCES.filter(s => s.priority === priority);
};

module.exports = {
  RSS_SOURCES,
  CATEGORIES,
  STATES,
  GOVERNMENT_KEYWORDS,
  isGovernmentRelated,
  getActiveSources,
  getSourcesByCategory,
  getSourcesByPriority
};
