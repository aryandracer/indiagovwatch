module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const keyId = process.env.RAZORPAY_KEY_ID;

  return res.status(200).json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel' : 'local',
    razorpay_configured: !!keyId,
    razorpay_key_prefix: keyId ? keyId.substring(0, 12) : 'not set'
  });
};
