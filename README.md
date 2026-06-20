# B2B Agent Ordering & Inventory Management SaaS Platform

Professional B2B inventory management, warehouse management, agent ordering and business operations platform.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS (with dark mode)
- **Icons**: lucide-react
- **Charts**: recharts
- **Backend / Auth / Storage / DB**: Supabase (PostgreSQL)
- **Deploy**: Vercel (or any Node host)

## Features
- Two fully separate login systems: **Agent (`/login`)** and **Administrator console (`/admin/login`)**
- Six roles with independent permissions: Super Admin, Warehouse Manager, Finance Manager, Operations Manager, Customer Service, Agent
- Auto-redirect after login based on role
- Dashboard with today's orders, revenue, pending orders, monthly revenue, inventory value, low-stock alerts, top products, top agents
- Product management with multi-language fields (EN / 简体中文 / 繁體中文), SKU, categories, brands, images, cost/wholesale/retail, tiered agent pricing, stock quantities, import/export
- Inventory operations: stock-in, stock-out, adjustment, warehouse transfer, audit log, configurable low-stock threshold
- Multi-warehouse support
- Agent management with approval, credit limits, outstanding balance, A/B/C levels
- Agent portal with product catalog, cart, orders, address book, profile settings
- Order management with full lifecycle (pending_review → pending_payment → approved → processing → shipped → completed → cancelled), shipping address, carrier, tracking number, notes, payment proof, invoice download
- Finance center: revenue, profit, accounts receivable, agent debt, monthly & yearly reports
- Notifications center with unread badges, notification types, email fallback
- Analytics center: sales trends, inventory, product rankings, agent rankings, etc.
- Employee permissions: view, create, edit, delete, export per-role toggles
- Audit log of every action with user, time and IP
- System settings: company info, logo, currency, tax rate
- Multi-language UI: English / 简体中文 / 繁體中文
- Multi-currency: GBP, USD, EUR, AUD, CAD
- Light & dark theme

## Getting started
```bash
npm install
cp .env.example .env.local  # fill in your Supabase project URL and anon key
npm run dev
```

Then open http://localhost:3000

### Demo logins
- `admin@company.com` / `admin123` — Super Admin
- `warehouse@company.com` / `admin123` — Warehouse Manager
- `finance@company.com` / `admin123` — Finance Manager
- `ops@company.com` / `admin123` — Operations Manager
- `support@company.com` / `admin123` — Customer Service
- `agent@demo.com` / `agent123` — Agent (Level A)
- `agent2@demo.com` / `agent123` — Agent (Level B)

## Project structure
```
app/
  page.tsx                     # Marketing landing page
  layout.tsx                   # Root layout
  globals.css                  # Global styles & design tokens
  login/
    page.tsx                   # Agent login
  admin/
    login/page.tsx             # Admin login
    dashboard/page.tsx         # Admin dashboard with KPIs & charts
    products/page.tsx          # Product catalog CRUD
    inventory/page.tsx         # Inventory operations + logs
    warehouse/page.tsx         # Warehouse management
    agents/page.tsx            # Agent management
    orders/page.tsx            # Orders table + details
    shipping/page.tsx          # Shipping/carrier management
    finance/page.tsx           # Financial center
    analytics/page.tsx         # Business analytics
    notifications/page.tsx     # Notifications center
    settings/page.tsx          # System settings
    employees/page.tsx         # Employee accounts & permissions
    audit-logs/page.tsx        # Audit logs
    customer-service/page.tsx  # CS ticket overview
    operations/page.tsx        # Operations center

agent/
  dashboard/page.tsx           # Agent dashboard
  catalog/page.tsx             # Product catalog with agent-level pricing
  cart/page.tsx                # Shopping cart & checkout
  orders/page.tsx              # Agent's orders
  addresses/page.tsx           # Address book
  settings/page.tsx            # Agent profile

components/
  AppProvider.tsx              # Global state: user, theme, language, currency
  Sidebar.tsx                  # Sidebars, topbar, cards, badges, stat cards
  Layout.tsx                   # AdminLayout + AgentLayout

lib/
  i18n.ts                      # Translation dictionaries (EN, ZH-CN, ZH-TW)
  mockData.ts                  # Sample products, agents, orders, warehouses, logs
  supabase.ts                  # Supabase client
  cart.tsx                     # Agent shopping cart context
  utils.ts                     # Currency & number formatters

supabase/
  migrations/001_b2b_schema.sql  # PostgreSQL schema for Supabase
```

## Database schema
The full relational schema (companies, employees, agents, products, warehouses, inventory_logs, orders, order_items, notifications, audit_logs, system_settings) with indexes and row-level security policies is defined in `supabase/migrations/001_b2b_schema.sql`.

The demo site currently uses in-memory mock data so you can preview every page without a running database. Replace the mock layer with `lib/supabase.ts` calls and connect the real tables to your Supabase project.

## Deploying on Vercel
1. Push this repository to GitHub/GitLab
2. Import it on [Vercel](https://vercel.com/new)
3. Add the environment variables from `.env.example`
4. Deploy

## Roadmap / future expansion
- WhatsApp & Telegram notifications
- ERP / accounting integrations
- Multi-country warehouses
- Franchise and regional-distributor hierarchies
- CRM & ticket system
- Customer-facing webstore tied to the same catalog
