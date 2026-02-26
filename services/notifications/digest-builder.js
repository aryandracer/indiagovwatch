const { CATEGORIES } = require('../content/sources');

/**
 * Build a personalized daily digest email for a user
 * @param {Object} user - User object with name, email, language
 * @param {Array} contentItems - Array of content items to include
 * @param {Object} preferences - User preferences
 * @returns {string} HTML email content
 */
function buildDigestEmail(user, contentItems, preferences = {}) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Group content by category
  const grouped = groupByCategory(contentItems);

  // Build content sections
  const contentSections = buildContentSections(grouped);

  // Build HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IndiaGovWatch Daily Digest</title>
</head>
<body style="font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #FF6B1A 0%, #138808 100%); padding: 25px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">IndiaGovWatch</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 13px;">Daily Government Digest</p>
            </td>
            <td style="text-align: right;">
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 13px;">${today}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding: 30px 30px 10px 30px;">
        <p style="color: #333; font-size: 16px; margin: 0;">
          Namaste <strong>${user.name || 'there'}</strong>,
        </p>
        <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
          Here's your personalized update on government schemes, jobs, and policies.
        </p>
      </td>
    </tr>

    <!-- Quick Stats -->
    <tr>
      <td style="padding: 15px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px;">
          <tr>
            ${buildStatBox('Updates', contentItems.length, '#FF6B1A')}
            ${buildStatBox('Categories', Object.keys(grouped).length, '#138808')}
            ${buildStatBox('States', countStates(contentItems), '#0B1426')}
          </tr>
        </table>
      </td>
    </tr>

    <!-- Content Sections -->
    ${contentSections}

    <!-- No Content Message -->
    ${contentItems.length === 0 ? `
    <tr>
      <td style="padding: 30px; text-align: center;">
        <p style="color: #666; font-size: 14px;">
          No new updates matching your preferences today. Check back tomorrow!
        </p>
        <a href="https://indiagovwatch.in/dashboard/preferences"
           style="color: #FF6B1A; font-size: 14px;">
          Update your preferences
        </a>
      </td>
    </tr>
    ` : ''}

    <!-- CTA -->
    <tr>
      <td style="padding: 20px 30px 30px 30px; text-align: center;">
        <a href="https://indiagovwatch.in/dashboard"
           style="display: inline-block; background-color: #FF6B1A; color: #ffffff;
                  padding: 12px 30px; text-decoration: none; border-radius: 6px;
                  font-weight: 600; font-size: 14px;">
          View Full Dashboard
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #0B1426; padding: 25px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
                You're receiving this because you subscribed to IndiaGovWatch updates.
              </p>
              <p style="color: #666; font-size: 11px; margin: 0;">
                <a href="https://indiagovwatch.in/dashboard/preferences" style="color: #FF6B1A;">Manage preferences</a>
                &nbsp;|&nbsp;
                <a href="https://indiagovwatch.in/unsubscribe?email=${encodeURIComponent(user.email)}" style="color: #888;">Unsubscribe</a>
              </p>
            </td>
            <td style="text-align: right;">
              <p style="color: #666; font-size: 11px; margin: 0;">
                &copy; ${new Date().getFullYear()} IndiaGovWatch
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return html;
}

/**
 * Group content items by category
 * @param {Array} items - Content items
 * @returns {Object} Grouped items
 */
function groupByCategory(items) {
  const grouped = {};

  for (const item of items) {
    const category = item.category || 'policy';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  }

  // Sort categories by priority
  const priority = ['schemes', 'jobs', 'tenders', 'rti', 'policy'];
  const sorted = {};

  for (const cat of priority) {
    if (grouped[cat]) {
      sorted[cat] = grouped[cat];
    }
  }

  return sorted;
}

/**
 * Build stat box HTML
 * @param {string} label - Stat label
 * @param {number} value - Stat value
 * @param {string} color - Accent color
 * @returns {string} HTML
 */
function buildStatBox(label, value, color) {
  return `
    <td style="width: 33.33%; padding: 15px; text-align: center;">
      <p style="color: ${color}; font-size: 24px; font-weight: bold; margin: 0;">${value}</p>
      <p style="color: #777; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase;">${label}</p>
    </td>
  `;
}

/**
 * Count unique states in content
 * @param {Array} items - Content items
 * @returns {number} State count
 */
function countStates(items) {
  const states = new Set(items.map(i => i.state).filter(Boolean));
  return states.size || 1; // At least 1 for "National"
}

/**
 * Build content sections HTML
 * @param {Object} grouped - Grouped content by category
 * @returns {string} HTML
 */
function buildContentSections(grouped) {
  let html = '';

  const categoryColors = {
    schemes: '#138808',
    jobs: '#FF6B1A',
    tenders: '#0066CC',
    rti: '#6B21A8',
    policy: '#0B1426'
  };

  const categoryIcons = {
    schemes: '🏛️',
    jobs: '💼',
    tenders: '📋',
    rti: '📜',
    policy: '⚖️'
  };

  for (const [category, items] of Object.entries(grouped)) {
    const categoryInfo = CATEGORIES[category] || { name: category };
    const color = categoryColors[category] || '#333';
    const icon = categoryIcons[category] || '📰';

    html += `
    <tr>
      <td style="padding: 20px 30px 10px 30px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-bottom: 2px solid ${color}; padding-bottom: 8px;">
              <span style="font-size: 16px; margin-right: 8px;">${icon}</span>
              <span style="color: ${color}; font-size: 16px; font-weight: 600;">
                ${categoryInfo.name || category.toUpperCase()}
              </span>
              <span style="color: #999; font-size: 13px; margin-left: 10px;">
                (${items.length} update${items.length > 1 ? 's' : ''})
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `;

    // Add items (max 5 per category)
    const displayItems = items.slice(0, 5);
    for (const item of displayItems) {
      html += buildContentItem(item, color);
    }

    // "View more" link if truncated
    if (items.length > 5) {
      html += `
      <tr>
        <td style="padding: 5px 30px 15px 30px;">
          <a href="https://indiagovwatch.in/dashboard?category=${category}"
             style="color: ${color}; font-size: 13px; text-decoration: none;">
            View ${items.length - 5} more ${categoryInfo.name || category} updates →
          </a>
        </td>
      </tr>
      `;
    }
  }

  return html;
}

/**
 * Build single content item HTML
 * @param {Object} item - Content item
 * @param {string} accentColor - Category color
 * @returns {string} HTML
 */
function buildContentItem(item, accentColor) {
  const publishedDate = item.published_at
    ? new Date(item.published_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
      })
    : '';

  const stateTag = item.state
    ? `<span style="background-color: #e8f4ea; color: #138808; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-left: 8px;">${item.state}</span>`
    : '';

  const description = item.description
    ? item.description.substring(0, 150) + (item.description.length > 150 ? '...' : '')
    : '';

  return `
  <tr>
    <td style="padding: 12px 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 6px; border-left: 3px solid ${accentColor};">
        <tr>
          <td style="padding: 15px;">
            <a href="${item.url || '#'}"
               style="color: #0B1426; font-size: 14px; font-weight: 600; text-decoration: none; line-height: 1.4;">
              ${escapeHtml(item.title)}
            </a>
            ${stateTag}
            ${description ? `
              <p style="color: #666; font-size: 13px; margin: 8px 0 0 0; line-height: 1.5;">
                ${escapeHtml(description)}
              </p>
            ` : ''}
            <p style="color: #999; font-size: 11px; margin: 8px 0 0 0;">
              ${publishedDate}
              ${item.url ? `<a href="${item.url}" style="color: ${accentColor}; margin-left: 10px;">Read more →</a>` : ''}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  `;
}

/**
 * Escape HTML entities
 * @param {string} text - Raw text
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build a preview of the digest (shorter version for dashboard)
 * @param {Array} contentItems - Content items
 * @returns {Object} Preview data
 */
function buildDigestPreview(contentItems) {
  const grouped = groupByCategory(contentItems);

  const preview = {
    totalItems: contentItems.length,
    categories: {},
    topItems: []
  };

  for (const [category, items] of Object.entries(grouped)) {
    preview.categories[category] = {
      count: items.length,
      items: items.slice(0, 3).map(item => ({
        title: item.title,
        url: item.url,
        state: item.state,
        published_at: item.published_at
      }))
    };
  }

  // Top 5 most recent items across all categories
  preview.topItems = contentItems
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 5)
    .map(item => ({
      title: item.title,
      category: item.category,
      url: item.url,
      published_at: item.published_at
    }));

  return preview;
}

module.exports = {
  buildDigestEmail,
  buildDigestPreview,
  groupByCategory,
  escapeHtml
};
