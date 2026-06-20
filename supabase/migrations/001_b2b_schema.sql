-- B2B Agent Ordering & Inventory Management Platform
-- PostgreSQL database schema (Supabase-compatible)

-- Enable extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Roles
create type user_role as enum (
  'super_admin',
  'warehouse_manager',
  'finance_manager',
  'operations_manager',
  'customer_service',
  'agent'
);

create type agent_level as enum ('A', 'B', 'C');

create type order_status as enum (
  'pending_review',
  'pending_payment',
  'approved',
  'processing',
  'shipped',
  'completed',
  'cancelled'
);

-- Organizations/company
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  phone text,
  email text,
  default_lang text not null default 'en',
  default_currency text not null default 'GBP',
  tax_rate numeric(5,2) not null default 20,
  created_at timestamptz not null default now()
);

-- Employees (admin/staff)
create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  auth_id uuid, -- references auth.users(id)
  name text not null,
  email citext unique not null,
  role user_role not null,
  permissions jsonb not null default '{"view": true, "create": false, "edit": false, "delete": false, "export": false}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Agents / Distributors
create table agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  auth_id uuid,
  company_name text,
  contact_name text not null,
  email citext not null,
  phone text,
  country text,
  status text not null default 'pending',
  level agent_level not null default 'B',
  credit_limit numeric(12,2) not null default 0,
  outstanding_balance numeric(12,2) not null default 0,
  invite_code text unique,
  created_at timestamptz not null default now(),
  unique (email)
);

-- Product categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  unique (company_id, slug)
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  sku text not null,
  name_en text not null,
  name_zh text,
  description_en text,
  description_zh text,
  category_id uuid references categories(id) on delete set null,
  brand text,
  images text[],
  cost_price numeric(12,2) not null default 0,
  wholesale_price numeric(12,2) not null default 0,
  retail_price numeric(12,2) not null default 0,
  level_a_price numeric(12,2) not null default 0,
  level_b_price numeric(12,2) not null default 0,
  level_c_price numeric(12,2) not null default 0,
  stock_quantity int not null default 0,
  low_stock_threshold int not null default 20,
  warehouse_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (company_id, sku)
);

-- Warehouses
create table warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  location text,
  manager text,
  created_at timestamptz not null default now()
);

alter table products
  add constraint fk_product_warehouse
  foreign key (warehouse_id) references warehouses(id) on delete set null;

-- Inventory logs
create table inventory_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete set null,
  operator_id uuid references employees(id) on delete set null,
  change_qty int not null,
  note text,
  created_at timestamptz not null default now()
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  order_no text unique not null,
  status order_status not null default 'pending_review',
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  shipping_name text,
  shipping_phone text,
  shipping_country text,
  shipping_address text,
  shipping_city text,
  shipping_postal text,
  carrier text,
  tracking_number text,
  payment_proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  sku text,
  product_name text,
  qty int not null,
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  recipient_id uuid,
  recipient_type text not null, -- 'employee' or 'agent'
  type text not null,
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit logs
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid,
  user_email text,
  action text not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- System settings
create table system_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid unique references companies(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_orders_agent on orders(agent_id);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);
create index idx_products_company on products(company_id);
create index idx_agents_company on agents(company_id);
create index idx_inventory_logs_product on inventory_logs(product_id);
create index idx_order_items_order on order_items(order_id);
create index idx_notifications_recipient on notifications(recipient_id, read);
create index idx_audit_logs_created on audit_logs(created_at desc);

-- Row-level security
alter table companies enable row level security;
alter table employees enable row level security;
alter table agents enable row level security;
alter table products enable row level security;
alter table warehouses enable row level security;
alter table inventory_logs enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- Sample policies
create policy employee_own_company on companies
  using (exists (select 1 from employees e where e.company_id = companies.id and auth_id = auth.uid()));
create policy agent_own_company on agents
  using (company_id in (select company_id from employees where auth_id = auth.uid()));
create policy agent_self on agents
  using (auth_id = auth.uid());
