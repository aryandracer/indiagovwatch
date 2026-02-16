module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  return res.status(200).json({
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'vercel' : 'local'
  });
};
