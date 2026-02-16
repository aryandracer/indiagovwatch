// Plan pricing configuration
const PLANS = {
  bharat: { amount: 9900, currency: 'INR', name: 'Bharat Plan', description: 'For individuals' },
  pro: { amount: 29900, currency: 'INR', name: 'Pro Plan', description: 'For professionals & NRIs' },
  global: { amount: 900, currency: 'USD', name: 'Global Plan', description: 'For international users' }
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const plans = Object.entries(PLANS).map(([id, plan]) => ({
      id,
      ...plan,
      displayAmount: plan.currency === 'INR'
        ? `₹${plan.amount / 100}`
        : `$${plan.amount / 100}`
    }));

    return res.status(200).json({
      success: true,
      data: plans
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch plans'
    });
  }
};
