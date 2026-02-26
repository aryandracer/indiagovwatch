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

    const { data, error } = await supabaseAdmin
      .from('content')
      .insert(items)
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
  getActiveSubscribers
};
