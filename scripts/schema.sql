-- ============================================================
-- B2B SaaS 平台数据库架构
-- 目标数据库：MySQL
-- 创建日期：2026-06-22
-- ============================================================

-- ============================================================
-- 仓库表
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  manager VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);

-- ============================================================
-- 产品表
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) PRIMARY KEY,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  name_zh VARCHAR(255) DEFAULT '',
  category VARCHAR(100) DEFAULT '',
  brand VARCHAR(100) DEFAULT '',
  images TEXT,
  description TEXT DEFAULT '',
  description_zh TEXT DEFAULT '',
  cost_price DECIMAL(10, 2) DEFAULT 0,
  wholesale_price DECIMAL(10, 2) DEFAULT 0,
  retail_price DECIMAL(10, 2) DEFAULT 0,
  stock INT DEFAULT 0,
  warehouse_id VARCHAR(100),
  warehouse_name VARCHAR(255) DEFAULT '',
  status VARCHAR(50) DEFAULT 'active',
  level_a_price DECIMAL(10, 2) DEFAULT 0,
  level_b_price DECIMAL(10, 2) DEFAULT 0,
  level_c_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- ============================================================
-- 代理商表
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(100) PRIMARY KEY,
  company VARCHAR(255) NOT NULL,
  contact VARCHAR(255) DEFAULT '',
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  country VARCHAR(100) DEFAULT '',
  level VARCHAR(10) DEFAULT 'B',
  status VARCHAR(50) DEFAULT 'active',
  credit_limit DECIMAL(10, 2) DEFAULT 0,
  outstanding DECIMAL(10, 2) DEFAULT 0,
  join_date VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_level ON agents(level);

-- ============================================================
-- 订单表
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  order_no VARCHAR(100) NOT NULL UNIQUE,
  agent_id VARCHAR(100) NOT NULL,
  items TEXT,
  total DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending_review',
  date VARCHAR(20) NOT NULL,
  shipping_address TEXT DEFAULT '',
  postal_code VARCHAR(20) DEFAULT '',
  country VARCHAR(100) DEFAULT '',
  contact_name VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  notes TEXT DEFAULT '',
  tracking_number VARCHAR(100),
  company VARCHAR(255),
  shipping_fee DECIMAL(10, 2),
  shipped_at VARCHAR(20),
  tracking_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

-- ============================================================
-- 信用交易记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id VARCHAR(100) PRIMARY KEY,
  agent_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL,
  note TEXT DEFAULT '',
  time VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_agent_id ON credit_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_time ON credit_transactions(time);

-- ============================================================
-- 库存操作日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) DEFAULT '',
  warehouse VARCHAR(100),
  qty INT NOT NULL,
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  operator VARCHAR(100) DEFAULT 'Admin',
  time VARCHAR(20) NOT NULL,
  note TEXT DEFAULT '',
  from_warehouse VARCHAR(100),
  to_warehouse VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_time ON inventory_logs(time);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON inventory_logs(type);

-- ============================================================
-- 员工表
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  permissions TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);