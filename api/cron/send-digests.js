require('dotenv').config();
const {
  contentQueries,
  preferencesQueries,
  notificationQueries,
  getActiveSubscribers
} = require('../../lib/supabase');
const { buildDigestEmail } = require('../../services/notifications/digest-builder');
const { sendDigestEmail } = require('../../services/notifications/email-sender');

/**
 * Cron endpoint to send daily digest emails
 * Triggered at 8:00 AM IST daily
 *
 * Schedule: 30 2 * * * (2:30 UTC = 8:00 AM IST)
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

  console.log('Starting daily digest send cron job...');
  const startTime = Date.now();

  const stats = {
    subscribersProcessed: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: []
  };

  try {
    // Get all active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active subscribers to send digests to',
        timestamp: new Date().toISOString()
      });
    }

    // Process each subscriber
    for (const subscription of subscribers) {
      const user = subscription.users;
      if (!user || !user.email) {
        console.log('Skipping subscriber without email:', subscription.user_id);
        continue;
      }

      stats.subscribersProcessed++;

      try {
        // Get user preferences
        let preferences;
        try {
          preferences = await preferencesQueries.get(user.id);
        } catch (e) {
          // Use defaults if no preferences found
          preferences = {
            categories: ['schemes', 'jobs', 'tenders', 'rti', 'policy'],
            states: [],
            keywords: []
          };
        }

        const categories = preferences?.categories || ['schemes', 'jobs', 'tenders', 'rti', 'policy'];
        const states = preferences?.states || [];
        const keywords = preferences?.keywords || [];

        // Get unsent content matching user preferences
        const content = await contentQueries.getUnsentForUser(
          categories,
          states,
          keywords,
          30 // Max items per digest
        );

        if (content.length === 0) {
          console.log(`No new content for user ${user.email}`);
          continue;
        }

        // Build and send digest email
        const digestHtml = buildDigestEmail(user, content, preferences);
        const sendResult = await sendDigestEmail(user, digestHtml);

        if (sendResult.success) {
          stats.emailsSent++;

          // Log the notification
          const contentIds = content.map(c => c.id);
          try {
            await notificationQueries.log(user.id, contentIds);
          } catch (logError) {
            console.error('Error logging notification:', logError.message);
          }

          console.log(`Digest sent to ${user.email} with ${content.length} items`);
        } else {
          stats.emailsFailed++;
          stats.errors.push({
            email: user.email,
            error: sendResult.error
          });
          console.error(`Failed to send digest to ${user.email}:`, sendResult.error);
        }

      } catch (userError) {
        stats.emailsFailed++;
        stats.errors.push({
          email: user.email,
          error: userError.message
        });
        console.error(`Error processing user ${user.email}:`, userError.message);
      }
    }

    // Mark all sent content as sent (globally, not per-user, to avoid duplicates)
    // Note: In a production system, you might want per-user tracking
    // For now, we track via notifications_sent table

    const duration = Date.now() - startTime;
    console.log(`Digest send completed in ${duration}ms`);

    return res.status(200).json({
      success: true,
      message: 'Daily digest send completed',
      stats: {
        subscribersProcessed: stats.subscribersProcessed,
        emailsSent: stats.emailsSent,
        emailsFailed: stats.emailsFailed,
        duration: `${duration}ms`
      },
      errors: stats.errors.length > 0 ? stats.errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Digest send cron error:', error);

    return res.status(500).json({
      success: false,
      error: 'Digest send failed',
      message: error.message,
      stats,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
};
