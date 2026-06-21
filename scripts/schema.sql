-- ============================================================
-- B2B SaaS 平台数据库架构
-- 目标数据库：PostgreSQL (Supabase)
-- 创建日期：2026-06-20
-- ============================================================

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 仓库表
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  manager TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);

-- ============================================================
-- 产品表
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_zh TEXT DEFAULT '',
  category TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  images TEXT[] DEFAULT '{}',
  description TEXT DEFAULT '',
  description_zh TEXT DEFAULT '',
  cost_price NUMERIC(10, 2) DEFAULT 0,
  wholesale_price NUMERIC(10, 2) DEFAULT 0,
  retail_price NUMERIC(10, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
  warehouse_name TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  level_a_price NUMERIC(10, 2) DEFAULT 0,
  level_b_price NUMERIC(10, 2) DEFAULT 0,
  level_c_price NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- ============================================================
-- 代理商表
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  contact TEXT DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT DEFAULT '',
  level TEXT DEFAULT 'B',
  status TEXT DEFAULT 'active',
  credit_limit NUMERIC(10, 2) DEFAULT 0,
  outstanding NUMERIC(10, 2) DEFAULT 0,
  join_date TEXT DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_level ON agents(level);

-- ============================================================
-- 订单表
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending_review',
  date TEXT NOT NULL,
  shipping_address TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT '',
  contact_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tracking_number TEXT,
  company TEXT,
  shipping_fee NUMERIC(10, 2),
  shipped_at TEXT,
  tracking_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

-- ============================================================
-- 信用交易记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  balance NUMERIC(10, 2) NOT NULL,
  note TEXT DEFAULT '',
  time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_agent_id ON credit_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_time ON credit_transactions(time);

-- ============================================================
-- 库存操作日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  warehouse TEXT,
  qty INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  operator TEXT DEFAULT 'Admin',
  time TEXT NOT NULL,
  note TEXT DEFAULT '',
  from_warehouse TEXT,
  to_warehouse TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_time ON inventory_logs(time);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON inventory_logs(type);

-- ============================================================
-- 员工表
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);

-- ============================================================
-- Row Level Security (RLS) 策略
-- 在生产环境中启用此功能以增强安全性
-- ============================================================

-- ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 数据完整性约束
-- ============================================================
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_check;
ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= 0);

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_credit_limit_check;
ALTER TABLE agents ADD CONSTRAINT agents_credit_limit_check CHECK (credit_limit >= 0);

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_outstanding_check;
ALTER TABLE agents ADD CONSTRAINT agents_outstanding_check CHECK (outstanding >= 0);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_total_check;
ALTER TABLE orders ADD CONSTRAINT orders_total_check CHECK (total >= 0);

-- ============================================================
-- 更新时间触发器（自动更新 updated_at）
-- ============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_warehouses_modtime ON warehouses;
CREATE TRIGGER update_warehouses_modtime BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_products_modtime ON products;
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_agents_modtime ON agents;
CREATE TRIGGER update_agents_modtime BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_orders_modtime ON orders;
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_modified_column();
