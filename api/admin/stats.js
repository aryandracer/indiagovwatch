require('dotenv').config();
const { supabaseAdmin } = require('../../lib/supabase');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'igw2026admin';

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check admin key
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: newUsersThisWeek } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // Subscriptions by status
    const { data: statusData } = await supabaseAdmin
      .from('subscriptions')
      .select('status');

    const statusBreakdown = [];
    const statusCounts = {};
    (statusData || []).forEach(s => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    for (const [status, count] of Object.entries(statusCounts)) {
      statusBreakdown.push({ status, count });
    }

    const activeSubscriptions = statusCounts['active'] || 0;
    const trialUsers = statusCounts['trial'] || 0;

    // Subscriptions by plan
    const { data: planData } = await supabaseAdmin
      .from('subscriptions')
      .select('plan');

    const planBreakdown = [];
    const planCounts = {};
    (planData || []).forEach(p => {
      planCounts[p.plan] = (planCounts[p.plan] || 0) + 1;
    });
    for (const [plan, count] of Object.entries(planCounts)) {
      planBreakdown.push({ plan, count });
    }

    // Total revenue
    const { data: paymentsData } = await supabaseAdmin
      .from('payments')
      .select('amount, status, created_at')
      .eq('status', 'completed');

    const totalRevenue = (paymentsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    // Revenue this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const revenueThisMonth = (paymentsData || [])
      .filter(p => new Date(p.created_at) >= monthAgo)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Recent users with subscriptions
    const { data: recentUsers } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        created_at,
        subscriptions (
          plan,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedUsers = (recentUsers || []).map(u => ({
      email: u.email,
      name: u.name,
      created_at: u.created_at,
      plan: u.subscriptions?.[0]?.plan,
      status: u.subscriptions?.[0]?.status
    }));

    // Recent payments
    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select(`
        amount,
        status,
        created_at,
        user_id,
        users (
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedPayments = (recentPayments || []).map(p => ({
      email: p.users?.email,
      amount: p.amount,
      status: p.status,
      created_at: p.created_at
    }));

    // Conversion rate
    const conversionRate = totalUsers > 0
      ? Math.round((activeSubscriptions / totalUsers) * 100)
      : 0;

    const trialConversion = trialUsers > 0
      ? Math.round((activeSubscriptions / (activeSubscriptions + trialUsers)) * 100)
      : 0;

    return res.status(200).json({
      totalUsers: totalUsers || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      activeSubscriptions,
      trialUsers,
      totalRevenue,
      revenueThisMonth,
      conversionRate,
      trialConversion,
      statusBreakdown,
      planBreakdown,
      recentUsers: formattedUsers,
      recentPayments: formattedPayments
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
};
