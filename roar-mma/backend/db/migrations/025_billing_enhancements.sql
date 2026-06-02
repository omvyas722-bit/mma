-- Phase 25: Billing enhancements (write-offs, Stripe fields, MRR history)
ALTER TABLE transactions ADD COLUMN write_off_reason TEXT;
ALTER TABLE transactions ADD COLUMN write_off_at TEXT;
ALTER TABLE transactions ADD COLUMN write_off_by INTEGER REFERENCES staff(id);
ALTER TABLE transactions ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE transactions ADD COLUMN stripe_payment_method TEXT;

CREATE TABLE IF NOT EXISTS mrr_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL,
  mrr REAL NOT NULL DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  churned_members INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  churn_rate REAL DEFAULT 0,
  arpu REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mrr_month ON mrr_history(month);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id),
  plan_name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'AUD',
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','cancelled','expired')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  cancelled_at TEXT,
  pause_start TEXT,
  pause_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sub_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_sub_stripe ON subscriptions(stripe_subscription_id);
