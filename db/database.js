const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'indiagovwatch.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize tables immediately
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT NOT NULL,
    language TEXT DEFAULT 'English',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Subscriptions table
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT DEFAULT 'trial',
    trial_end DATETIME,
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Payments table
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Create indexes for faster queries
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
`);

console.log('Database initialized successfully');

// Initialize database function (kept for compatibility)
function initializeDatabase() {
  // Tables already created above
  return true;
}

// User operations
const userQueries = {
  create: db.prepare(`
    INSERT INTO users (id, name, email, mobile, language)
    VALUES (?, ?, ?, ?, ?)
  `),

  findByEmail: db.prepare(`
    SELECT * FROM users WHERE email = ?
  `),

  findById: db.prepare(`
    SELECT * FROM users WHERE id = ?
  `),

  update: db.prepare(`
    UPDATE users SET name = ?, mobile = ? WHERE id = ?
  `)
};

// Subscription operations
const subscriptionQueries = {
  create: db.prepare(`
    INSERT INTO subscriptions (id, user_id, plan, status, trial_end, start_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  findByUserId: db.prepare(`
    SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `),

  updateStatus: db.prepare(`
    UPDATE subscriptions SET status = ?, end_date = ? WHERE id = ?
  `)
};

// Payment operations
const paymentQueries = {
  create: db.prepare(`
    INSERT INTO payments (id, user_id, razorpay_order_id, amount, currency, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  findByOrderId: db.prepare(`
    SELECT * FROM payments WHERE razorpay_order_id = ?
  `),

  updateStatus: db.prepare(`
    UPDATE payments SET status = ?, razorpay_payment_id = ? WHERE razorpay_order_id = ?
  `)
};

module.exports = {
  db,
  initializeDatabase,
  userQueries,
  subscriptionQueries,
  paymentQueries
};
