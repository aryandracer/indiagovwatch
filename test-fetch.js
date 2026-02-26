const { parseMultipleFeeds } = require('./services/content/rss-parser');
const { filterAndDedupe } = require('./services/content/categorizer');
const { getActiveSources } = require('./services/content/sources');

async function testFetch() {
  console.log('=== IndiaGovWatch Content Fetch Test ===\n');

  const sources = getActiveSources();
  console.log('Sources configured:', sources.length);
  console.log('');

  // Fetch all feeds
  console.log('Fetching content from all sources...\n');
  const allItems = await parseMultipleFeeds(sources);

  console.log('Raw items fetched:', allItems.length);

  // Filter and process
  const processed = filterAndDedupe(allItems, []);
  console.log('After filtering for government relevance:', processed.length);
  console.log('');

  // Group by category
  const byCategory = {};
  processed.forEach(item => {
    const cat = item.category || 'policy';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  // Display results
  for (const [cat, items] of Object.entries(byCategory)) {
    console.log('=== ' + cat.toUpperCase() + ' (' + items.length + ' items) ===');
    items.slice(0, 5).forEach(item => {
      console.log('  - ' + item.title.substring(0, 75) + (item.title.length > 75 ? '...' : ''));
      if (item.state) console.log('    [State: ' + item.state + ']');
    });
    if (items.length > 5) console.log('  ... and ' + (items.length - 5) + ' more');
    console.log('');
  }
}

testFetch().catch(console.error);
