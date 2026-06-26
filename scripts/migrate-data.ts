// ============================================================
// 数据迁移工具：JSON 文件 → Supabase 数据库
// 使用方式：
//   npm run migrate
//   或：node -r ts-node/register scripts/migrate-data.ts
// ============================================================

import { promises as fs } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// 从环境变量读取 Supabase 配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("❌ 缺少 Supabase 环境变量");
  console.error("请设置以下环境变量：");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILES = {
  warehouses: path.join(DATA_DIR, "warehouses.json"),
  products: path.join(DATA_DIR, "products.json"),
  agents: path.join(DATA_DIR, "agents.json"),
  orders: path.join(DATA_DIR, "orders.json"),
  credit: path.join(DATA_DIR, "credit.json"),
  inventoryLogs: path.join(DATA_DIR, "inventory_logs.json"),
  employees: path.join(DATA_DIR, "employees.json"),
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ------------------------------------------------------------
// 工具函数
// ------------------------------------------------------------
async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

async function readJsonFileObj<T>(filePath: string): Promise<Record<string, T>> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as Record<string, T>;
  } catch {
    return {};
  }
}

async function clearTable(tableName: string): Promise<void> {
  const { error } = await supabase.from(tableName).delete().neq("id", "");
  if (error) {
    console.warn(`⚠️  清空表 ${tableName} 时出错：${error.message}`);
  } else {
    console.log(`✅ 清空表 ${tableName}`);
  }
}

// ------------------------------------------------------------
// 迁移各表
// ------------------------------------------------------------
async function migrateWarehouses(): Promise<number> {
  console.log("\n📦 正在迁移仓库数据...");
  const warehouses = await readJsonFile<any>(FILES.warehouses);

  if (warehouses.length === 0) {
    console.log("  ℹ️  无仓库数据需要迁移");
    return 0;
  }

  const transformed = warehouses.map((w: any) => ({
    id: w.id || `w${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: w.name,
    location: w.location || "",
    manager: w.manager || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("warehouses").insert(transformed);
  if (error) {
    console.error(`  ❌ 仓库导入失败：${error.message}`);
    return 0;
  }

  console.log(`  ✅ 成功导入 ${warehouses.length} 个仓库`);
  return warehouses.length;
}

async function migrateProducts(): Promise<number> {
  console.log("\n📦 正在迁移产品数据...");
  const products = await readJsonFile<any>(FILES.products);

  if (products.length === 0) {
    console.log("  ℹ️  无产品数据需要迁移");
    return 0;
  }

  const transformed = products.map((p: any) => ({
    id: p.id || `p${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sku: p.sku || "",
    name: p.name || "",
    name_zh: p.nameZh || p.name_zh || "",
    category: p.category || "",
    brand: p.brand || "",
    images: p.images || [],
    description: p.description || "",
    description_zh: p.descriptionZh || p.description_zh || "",
    cost_price: p.costPrice || p.cost_price || 0,
    wholesale_price: p.wholesalePrice || p.wholesale_price || 0,
    retail_price: p.retailPrice || p.retail_price || 0,
    stock: p.stock || 0,
    warehouse_id: p.warehouseId || p.warehouse_id || null,
    warehouse_name: p.warehouse || p.warehouse_name || "",
    status: p.status || "active",
    level_a_price: p.levelAPrice || p.level_a_price || 0,
    level_b_price: p.levelBPrice || p.level_b_price || 0,
    level_c_price: p.levelCPrice || p.level_c_price || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // 分批插入（Supabase 单次插入有限制）
  const batchSize = 100;
  let totalInserted = 0;
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize);
    const { error } = await supabase.from("products").insert(batch);
    if (error) {
      console.error(`  ❌ 批次 ${Math.floor(i / batchSize) + 1} 导入失败：${error.message}`);
    } else {
      totalInserted += batch.length;
    }
  }

  console.log(`  ✅ 成功导入 ${totalInserted} 个产品`);
  return totalInserted;
}

async function migrateAgents(): Promise<number> {
  console.log("\n📦 正在迁移代理商数据...");
  const agents = await readJsonFile<any>(FILES.agents);

  if (agents.length === 0) {
    console.log("  ℹ️  无代理商数据需要迁移");
    return 0;
  }

  const transformed = agents.map((a: any) => ({
    id: a.id || `a${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    company: a.company || "",
    contact: a.contact || "",
    email: a.email || "",
    password: a.password || "agent123",
    phone: a.phone || "",
    country: a.country || "",
    level: a.level || "B",
    status: a.status || "active",
    credit_limit: a.creditLimit || a.credit_limit || 10000,
    outstanding: a.outstanding || 0,
    join_date: a.joinDate || a.join_date || new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("agents").insert(transformed);
  if (error) {
    console.error(`  ❌ 代理商导入失败：${error.message}`);
    return 0;
  }

  console.log(`  ✅ 成功导入 ${agents.length} 个代理商`);
  return agents.length;
}

async function migrateOrders(): Promise<number> {
  console.log("\n📦 正在迁移订单数据...");
  const orders = await readJsonFile<any>(FILES.orders);

  if (orders.length === 0) {
    console.log("  ℹ️  无订单数据需要迁移");
    return 0;
  }

  const transformed = orders.map((o: any) => ({
    id: o.id || `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    order_no: o.orderNo || o.order_no || `ORD-${Date.now()}`,
    agent_id: o.agentId || o.agent_id,
    items: o.items || [],
    total: o.total || 0,
    status: o.status || "submitted",
    date: o.date || new Date().toISOString(),
    shipping_address: o.shippingAddress || o.shipping_address || "",
    postal_code: o.postalCode || o.postal_code || "",
    country: o.country || "",
    contact_name: o.contactName || o.contact_name || "",
    phone: o.phone || "",
    email: o.email || "",
    notes: o.notes || "",
    tracking_number: o.trackingNumber || o.tracking_number || null,
    company: o.company || null,
    shipping_fee: o.shippingFee || o.shipping_fee || null,
    shipped_at: o.shippedAt || o.shipped_at || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // 分批插入
  const batchSize = 100;
  let totalInserted = 0;
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize);
    const { error } = await supabase.from("orders").insert(batch);
    if (error) {
      console.error(`  ❌ 批次 ${Math.floor(i / batchSize) + 1} 导入失败：${error.message}`);
    } else {
      totalInserted += batch.length;
    }
  }

  console.log(`  ✅ 成功导入 ${totalInserted} 个订单`);
  return totalInserted;
}

async function migrateCreditTransactions(): Promise<number> {
  console.log("\n📦 正在迁移信用交易数据...");
  const credits = await readJsonFileObj<any>(FILES.credit);
  const transactions: any[] = [];

  for (const agentId in credits) {
    const record = credits[agentId];
    if (record.transactions && Array.isArray(record.transactions)) {
      for (const txn of record.transactions) {
        transactions.push({
          id: txn.id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          agent_id: agentId,
          type: txn.type || "unknown",
          amount: txn.amount || 0,
          balance: txn.balance || 0,
          note: txn.note || "",
          time: txn.time || new Date().toISOString(),
        });
      }
    }
  }

  if (transactions.length === 0) {
    console.log("  ℹ️  无信用交易数据需要迁移");
    return 0;
  }

  // 分批插入
  const batchSize = 100;
  let totalInserted = 0;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const { error } = await supabase.from("credit_transactions").insert(batch);
    if (error) {
      console.error(`  ❌ 批次 ${Math.floor(i / batchSize) + 1} 导入失败：${error.message}`);
    } else {
      totalInserted += batch.length;
    }
  }

  console.log(`  ✅ 成功导入 ${totalInserted} 条信用交易`);
  return totalInserted;
}

async function migrateInventoryLogs(): Promise<number> {
  console.log("\n📦 正在迁移库存日志数据...");
  const logs = await readJsonFile<any>(FILES.inventoryLogs);

  if (logs.length === 0) {
    console.log("  ℹ️  无库存日志数据需要迁移");
    return 0;
  }

  const transformed = logs.map((l: any) => ({
    id: l.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: l.type || "stock_in",
    product_id: l.productId || l.product_id,
    product_name: l.productName || l.product_name || "",
    sku: l.sku || "",
    warehouse: l.warehouse || null,
    qty: l.qty || 0,
    stock_before: l.stockBefore || l.stock_before || 0,
    stock_after: l.stockAfter || l.stock_after || 0,
    operator: l.operator || "Admin",
    time: l.time || new Date().toISOString(),
    note: l.note || "",
    from_warehouse: l.fromWarehouse || l.from_warehouse || null,
    to_warehouse: l.toWarehouse || l.to_warehouse || null,
  }));

  // 分批插入
  const batchSize = 100;
  let totalInserted = 0;
  for (let i = 0; i < transformed.length; i += batchSize) {
    const batch = transformed.slice(i, i + batchSize);
    const { error } = await supabase.from("inventory_logs").insert(batch);
    if (error) {
      console.error(`  ❌ 批次 ${Math.floor(i / batchSize) + 1} 导入失败：${error.message}`);
    } else {
      totalInserted += batch.length;
    }
  }

  console.log(`  ✅ 成功导入 ${totalInserted} 条库存日志`);
  return totalInserted;
}

async function migrateEmployees(): Promise<number> {
  console.log("\n📦 正在迁移员工数据...");
  const employees = await readJsonFile<any>(FILES.employees);

  if (employees.length === 0) {
    console.log("  ℹ️  无员工数据需要迁移");
    return 0;
  }

  const transformed = employees.map((e: any) => ({
    id: e.id || `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: e.name || "",
    email: e.email || "",
    password: e.password || "admin123",
    permissions: e.permissions || {},
    active: e.active !== false,
    created_at: e.createdAt || e.created_at || new Date().toISOString(),
  }));

  const { error } = await supabase.from("employees").insert(transformed);
  if (error) {
    console.error(`  ❌ 员工导入失败：${error.message}`);
    return 0;
  }

  console.log(`  ✅ 成功导入 ${employees.length} 个员工`);
  return employees.length;
}

// ------------------------------------------------------------
// 验证迁移结果
// ------------------------------------------------------------
async function validateMigration(): Promise<void> {
  console.log("\n\n🔍 正在验证迁移结果...\n");

  const tables = [
    { name: "warehouses", label: "仓库" },
    { name: "products", label: "产品" },
    { name: "agents", label: "代理商" },
    { name: "orders", label: "订单" },
    { name: "credit_transactions", label: "信用交易" },
    { name: "inventory_logs", label: "库存日志" },
    { name: "employees", label: "员工" },
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table.name).select("*", { count: "exact", head: true });
      if (error) {
        console.log(`  ❌ ${table.label} (${table.name}): ${error.message}`);
      } else {
        console.log(`  ✅ ${table.label} (${table.name}): ${count} 条记录`);
      }
    } catch (err: any) {
      console.log(`  ❌ ${table.label} (${table.name}): ${err.message}`);
    }
  }
}

// ------------------------------------------------------------
// 主迁移流程
// ------------------------------------------------------------
async function main(): Promise<void> {
  console.log("============================================================");
  console.log("        B2B SaaS 平台数据迁移工具");
  console.log("        JSON 文件 → Supabase 数据库");
  console.log("============================================================\n");

  const startTime = Date.now();

  // 检查数据文件是否存在
  console.log("📁 检查本地数据文件：");
  const fileChecks = [
    { path: FILES.warehouses, label: "仓库" },
    { path: FILES.products, label: "产品" },
    { path: FILES.agents, label: "代理商" },
    { path: FILES.orders, label: "订单" },
    { path: FILES.credit, label: "信用额度" },
    { path: FILES.inventoryLogs, label: "库存日志" },
    { path: FILES.employees, label: "员工" },
  ];

  for (const file of fileChecks) {
    try {
      await fs.access(file.path);
      const stat = await fs.stat(file.path);
      console.log(`  ✅ ${file.label}: ${Math.round(stat.size / 1024)} KB`);
    } catch {
      console.log(`  ⚠️  ${file.label}: 文件不存在`);
    }
  }

  // 询问是否清空现有数据库数据
  console.log("\n⚠️  准备清空并重新导入数据库数据（该操作不可逆）...");

  // 按依赖顺序清空表
  const tables = ["inventory_logs", "credit_transactions", "orders", "products", "warehouses", "employees"];
  for (const table of tables) {
    await clearTable(table);
  }

  // 按依赖顺序迁移（注意：仓库和代理商需要先导入，因为有外键依赖）
  let totalRecords = 0;
  totalRecords += await migrateWarehouses();
  totalRecords += await migrateProducts();
  totalRecords += await migrateAgents();
  totalRecords += await migrateOrders();
  totalRecords += await migrateCreditTransactions();
  totalRecords += await migrateInventoryLogs();
  totalRecords += await migrateEmployees();

  // 验证迁移结果
  await validateMigration();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n============================================================");
  console.log(`        ✅ 迁移完成！共迁移 ${totalRecords} 条记录，耗时 ${elapsed} 秒`);
  console.log("============================================================");
  console.log("\n💡 建议：");
  console.log("  1. 检查各表数据完整性");
  console.log("  2. 测试登录和核心功能");
  console.log("  3. 验证外键关系是否正确");
  console.log("  4. 如果发现问题，可以重新运行此脚本\n");
}

main().catch((error) => {
  console.error("\n❌ 迁移过程中发生错误：", error);
  process.exit(1);
});
