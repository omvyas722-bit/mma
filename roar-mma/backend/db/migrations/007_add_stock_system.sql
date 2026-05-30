-- Phase 9: Stock/Merchandise System
-- Inventory management, sales tracking, low stock alerts
--
-- SAFETY: Do NOT drop tables here — CREATE TABLE IF NOT EXISTS below ensures
-- idempotent creation without data loss. The original DROP TABLE statements
-- have been intentionally omitted to prevent data destruction on re-run.
-- If you need a clean slate, use a separate reset script.
-- See migration 000_migration_tracking.sql for applied migration tracking.

-- Product catalog
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK(category IN ('apparel', 'equipment', 'supplements', 'accessories')),
  sku TEXT UNIQUE,
  barcode TEXT,
  cost_price REAL NOT NULL CHECK(cost_price > 0), -- what we pay
  sell_price REAL NOT NULL CHECK(sell_price > 0), -- what we charge
  stock_quantity INTEGER DEFAULT 0 CHECK(stock_quantity >= 0),
  min_stock_level INTEGER DEFAULT 5 CHECK(min_stock_level >= 0), -- alert threshold
  max_stock_level INTEGER CHECK(max_stock_level > 0),
  size TEXT, -- 'XS', 'S', 'M', 'L', 'XL', 'XXL', etc
  color TEXT,
  brand TEXT,
  supplier_id INTEGER,
  active INTEGER DEFAULT 1 CHECK(active IN (0,1)),
  image_url TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  active INTEGER DEFAULT 1 CHECK(active IN (0,1)),
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- Stock adjustments (manual corrections, damage, theft, etc)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('add', 'remove', 'correction', 'damage', 'theft', 'return')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  adjusted_by INTEGER NOT NULL, -- staff_id
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by) REFERENCES staff(id) ON DELETE CASCADE
);

-- Product sales
CREATE TABLE IF NOT EXISTS product_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price > 0),
  total_amount REAL NOT NULL CHECK(total_amount > 0),
  member_id INTEGER,
  sold_by INTEGER NOT NULL, -- staff_id
  payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'account')),
  transaction_id INTEGER, -- link to transactions table if paid via account
  sale_date DATETIME DEFAULT (datetime('now')),
  notes TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (sold_by) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Purchase orders (stock coming in from suppliers)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  order_number TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'ordered', 'received', 'cancelled')),
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  received_date DATE,
  total_cost REAL CHECK(total_cost > 0),
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE CASCADE,
  CHECK(received_date IS NULL OR received_date >= order_date)
);

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity_ordered INTEGER NOT NULL CHECK(quantity_ordered > 0),
  quantity_received INTEGER DEFAULT 0 CHECK(quantity_received >= 0),
  unit_cost REAL NOT NULL CHECK(unit_cost > 0),
  total_cost REAL NOT NULL CHECK(total_cost > 0),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CHECK(quantity_received <= quantity_ordered)
);

-- Low stock alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  alert_type TEXT DEFAULT 'low_stock' CHECK(alert_type IN ('low_stock', 'out_of_stock')),
  current_quantity INTEGER NOT NULL,
  min_quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'ignored')),
  resolved_at DATETIME,
  resolved_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES staff(id) ON DELETE CASCADE
);

-- Stock movement history (audit trail)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK(movement_type IN ('sale', 'adjustment', 'purchase', 'return')),
  quantity_change INTEGER NOT NULL, -- positive for increase, negative for decrease
  quantity_before INTEGER NOT NULL CHECK(quantity_before >= 0),
  quantity_after INTEGER NOT NULL CHECK(quantity_after >= 0),
  reference_type TEXT CHECK(reference_type IN ('product_sale', 'stock_adjustment', 'purchase_order')),
  reference_id INTEGER,
  created_by INTEGER,
  created_at DATETIME DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_product_sales_product ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON product_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_product_sales_member ON product_sales(member_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_adjusted_by ON stock_adjustments(adjusted_by);
CREATE INDEX IF NOT EXISTS idx_product_sales_sold_by ON product_sales(sold_by);
CREATE INDEX IF NOT EXISTS idx_product_sales_transaction ON product_sales(transaction_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);

-- Seed some default suppliers
INSERT INTO suppliers (name, contact_person, email, phone) VALUES
  ('Fight Gear Australia', 'John Smith', 'orders@fightgear.com.au', '08 9999 1111'),
  ('MMA Supplies Co', 'Sarah Jones', 'sales@mmasupplies.com.au', '08 9999 2222'),
  ('Nutrition Direct', 'Mike Brown', 'info@nutritiondirect.com.au', '08 9999 3333');

-- Seed some sample products
INSERT INTO products (name, description, category, sku, cost_price, sell_price, stock_quantity, min_stock_level, size, color, brand) VALUES
  ('ROAR MMA T-Shirt', 'Official gym t-shirt', 'apparel', 'TSHIRT-BLK-M', 15.00, 35.00, 20, 10, 'M', 'Black', 'ROAR'),
  ('ROAR MMA T-Shirt', 'Official gym t-shirt', 'apparel', 'TSHIRT-BLK-L', 15.00, 35.00, 15, 10, 'L', 'Black', 'ROAR'),
  ('Hand Wraps', 'Professional hand wraps', 'equipment', 'WRAP-001', 8.00, 20.00, 30, 15, NULL, 'Black', 'Everlast'),
  ('Boxing Gloves 12oz', 'Training boxing gloves', 'equipment', 'GLOVE-12OZ', 45.00, 95.00, 8, 5, '12oz', 'Red', 'Everlast'),
  ('Protein Powder 1kg', 'Whey protein isolate', 'supplements', 'PROT-WPI-1KG', 35.00, 65.00, 12, 8, '1kg', NULL, 'Optimum Nutrition'),
  ('Gym Bag', 'Large sports bag', 'accessories', 'BAG-001', 25.00, 55.00, 10, 5, NULL, 'Black', 'Nike'),
  ('Shin Guards', 'MMA shin guards', 'equipment', 'SHIN-001', 30.00, 70.00, 6, 5, 'L', 'Black', 'Venum'),
  ('Mouth Guard', 'Custom fit mouth guard', 'equipment', 'MOUTH-001', 5.00, 15.00, 25, 15, NULL, 'Clear', 'Shock Doctor');
