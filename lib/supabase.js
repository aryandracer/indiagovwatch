const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.warn('Warning: SUPABASE_URL is not set');
}

// Client for public operations (uses anon key with RLS)
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Admin client for server-side operations (bypasses RLS)
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// User queries
const userQueries = {
  async create(userData) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        email: userData.email,
        name: userData.name,
        phone: userData.phone || userData.mobile,
        language: userData.language || 'English'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Subscription queries
const subscriptionQueries = {
  async create(subscriptionData) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert([subscriptionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateStatus(id, status, dates = {}) {
    const updateData = { status, ...dates };
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateByUserId(userId, updates) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Payment queries
const paymentQueries = {
  async create(paymentData) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByOrderId(orderId) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateStatus(id, status, paymentId = null) {
    const updateData = { status };
    if (paymentId) updateData.razorpay_payment_id = paymentId;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// OTP queries
const otpQueries = {
  async create(email, otp, expiresAt) {
    const { data, error } = await supabaseAdmin
      .from('auth_otps')
      .insert([{
        email,
        otp,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findValidOtp(email, otp) {
    const { data, error } = await supabaseAdmin
      .from('auth_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async markUsed(id) {
    const { error } = await supabaseAdmin
      .from('auth_otps')
      .update({ used: true })
      .eq('id', id);

    if (error) throw error;
  },

  async cleanupExpired() {
    const { error } = await supabaseAdmin
      .from('auth_otps')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
  }
};

// Content source queries
const contentSourceQueries = {
  async getActive() {
    const { data, error } = await supabaseAdmin
      .from('content_sources')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  },

  async updateLastFetched(id) {
    const { error } = await supabaseAdmin
      .from('content_sources')
      .update({ last_fetched: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async create(sourceData) {
    const { data, error } = await supabaseAdmin
      .from('content_sources')
      .insert([sourceData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Content queries
const contentQueries = {
  async create(contentData) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .insert([contentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createMany(items) {
    if (!items.length) return [];

    // Only include fields that exist in the database schema
    const cleanItems = items.map(item => ({
      source_id: item.source_id || null,
      category: item.category,
      title: item.title,
      description: item.description,
      url: item.url,
      published_at: item.published_at,
      state: item.state,
      tags: item.tags,
      is_sent: item.is_sent || false,
      official_url: item.official_url || null,
      original_url: item.original_url || null
    }));

    const { data, error } = await supabaseAdmin
      .from('content')
      .insert(cleanItems)
      .select();

    if (error) throw error;
    return data || [];
  },

  async findByUrl(url) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .select('id')
      .eq('url', url)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getUnsentForUser(categories, states = [], keywords = [], limit = 50) {
    let query = supabaseAdmin
      .from('content')
      .select('*')
      .eq('is_sent', false)
      .in('category', categories)
      .order('published_at', { ascending: false })
      .limit(limit);

    // Filter by states if specified (null state = national, always included)
    if (states.length > 0) {
      query = query.or(`state.in.(${states.join(',')}),state.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter by keywords if specified (post-query for flexibility)
    let results = data || [];
    if (keywords.length > 0) {
      const keywordLower = keywords.map(k => k.toLowerCase());
      results = results.filter(item => {
        const text = `${item.title} ${item.description || ''}`.toLowerCase();
        return keywordLower.some(kw => text.includes(kw));
      });
    }

    return results;
  },

  async markSent(contentIds) {
    if (!contentIds.length) return;

    const { error } = await supabaseAdmin
      .from('content')
      .update({ is_sent: true })
      .in('id', contentIds);

    if (error) throw error;
  },

  async getRecent(category = null, limit = 20) {
    let query = supabaseAdmin
      .from('content')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};

// User preferences queries
const preferencesQueries = {
  async get(userId) {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async upsert(userId, preferences) {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Notification log queries
const notificationQueries = {
  async log(userId, contentIds) {
    const { data, error } = await supabaseAdmin
      .from('notifications_sent')
      .insert([{
        user_id: userId,
        content_ids: contentIds,
        status: 'sent'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRecentForUser(userId, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('notifications_sent')
      .select('*')
      .eq('user_id', userId)
      .gte('sent_at', since.toISOString())
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};

// Referral queries
const referralQueries = {
  async generateCode(userId) {
    // Generate unique 8-char code
    const code = 'IGW' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId)
      .select('referral_code')
      .single();

    if (error) throw error;
    return data.referral_code;
  },

  async getByCode(code) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, referral_code, referral_count, free_months_earned')
      .eq('referral_code', code)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async trackReferral(referrerId, referredId, code) {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .insert([{
        referrer_id: referrerId,
        referred_id: referredId,
        referral_code: code,
        status: 'completed'
      }])
      .select()
      .single();

    if (error) throw error;

    // Increment referral count
    await supabaseAdmin.rpc('increment_referral_count', { user_id: referrerId });

    return data;
  },

  async getUserReferrals(userId) {
    const { data, error } = await supabaseAdmin
      .from('referrals')
      .select('*, users!referred_id(email, name, created_at)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async checkAndReward(userId) {
    // Get user's referral count
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('referral_count, free_months_earned')
      .eq('id', userId)
      .single();

    if (!user) return null;

    // Every 3 referrals = 1 free month
    const earnedMonths = Math.floor(user.referral_count / 3);
    const newMonths = earnedMonths - (user.free_months_earned || 0);

    if (newMonths > 0) {
      // Update free months earned
      await supabaseAdmin
        .from('users')
        .update({ free_months_earned: earnedMonths })
        .eq('id', userId);

      // Extend subscription
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (sub) {
        const endDate = new Date(sub.end_date || sub.trial_end || new Date());
        endDate.setMonth(endDate.getMonth() + newMonths);

        await supabaseAdmin
          .from('subscriptions')
          .update({
            end_date: endDate.toISOString(),
            status: 'active'
          })
          .eq('user_id', userId);
      }

      return { newMonths, totalEarned: earnedMonths };
    }

    return { newMonths: 0, totalEarned: earnedMonths };
  }
};

// Get active subscribers for digest
const getActiveSubscribers = async () => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      user_id,
      plan,
      users!inner (
        id,
        email,
        name,
        language
      )
    `)
    .in('status', ['trial', 'active']);

  if (error) throw error;
  return data || [];
};

module.exports = {
  supabase,
  supabaseAdmin,
  userQueries,
  subscriptionQueries,
  paymentQueries,
  otpQueries,
  contentSourceQueries,
  contentQueries,
  preferencesQueries,
  notificationQueries,
  referralQueries,
  getActiveSubscribers
};
