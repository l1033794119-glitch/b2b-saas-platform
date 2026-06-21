import {
  Warehouse,
  Product,
  Agent,
  Order,
  CreditRecord,
  CreditTransaction,
  InventoryLog,
  Employee,
} from "./types/supabase";
import { query, queryOne, execute, isDatabaseConfigured } from "./db";

// ============================================================
// 数据访问层（支持双模式存储）
// - PostgreSQL 模式：使用本地 PostgreSQL 数据库
// - 内存存储模式：使用进程内内存存储
// ============================================================

// 动态检查数据库是否可用
async function useDatabase(): Promise<boolean> {
  if (!await isDatabaseConfigured()) return false;
  try {
    const result = await query("SELECT 1");
    return result.length >= 0;
  } catch (e: any) {
    console.warn("⚠️  数据库连接失败，使用内存存储:", e?.message || String(e));
    return false;
  }
}

// ------------------------------------------------------------
// 内存存储（后备方案）
// ------------------------------------------------------------
interface MemoryStore {
  warehouses: Warehouse[];
  products: Product[];
  agents: any[];
  orders: Order[];
  credits: Record<string, any>;
  inventoryLogs: InventoryLog[];
  employees: Employee[];
}

let memoryStore: MemoryStore;

function getMemoryStore(): MemoryStore {
  if (!memoryStore) {
    memoryStore = {
      warehouses: [
        { id: "w_main", name: "主仓库", location: "默认地址", manager: "管理员", stock: 0, value: 0 },
      ],
      products: [],
      agents: [],
      orders: [],
      credits: {},
      inventoryLogs: [],
      employees: [
        {
          id: "emp_admin",
          name: "Administrator",
          email: "admin@company.com",
          permissions: {
            dashboard: true, products: true, inventory: true, warehouse: true,
            agents: true, credit: true, orders: true, shipping: true, finance: true,
            analytics: true, notifications: true, employees: true, audit_logs: true, settings: true,
          },
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
  return memoryStore;
}

// ------------------------------------------------------------
// 仓库操作
// ------------------------------------------------------------
export async function getAllWarehouses(): Promise<Warehouse[]> {
  if (await useDatabase()) {
    const rows: any[] = await query("SELECT * FROM warehouses ORDER BY created_at DESC");

    const enriched: Warehouse[] = [];
    for (const wh of rows) {
      const productsData: any[] = await query(
        "SELECT stock, cost_price FROM products WHERE warehouse_id = $1",
        [wh.id]
      );
      const stock = (productsData || []).reduce((sum: number, p: any) => sum + (p.stock || 0), 0);
      const value = (productsData || []).reduce((sum: number, p: any) => sum + (p.stock || 0) * (p.cost_price || 0), 0);
      enriched.push({ id: wh.id, name: wh.name, location: wh.location, manager: wh.manager, stock, value });
    }
    return enriched;
  }
  return getMemoryStore().warehouses;
}

export async function createWarehouse(warehouse: Omit<Warehouse, "stock" | "value"> & { id?: string }): Promise<Warehouse> {
  const id = warehouse.id || `w${Date.now()}`;
  const now = new Date().toISOString();

  if (await useDatabase()) {
    await execute(
      `INSERT INTO warehouses (id, name, location, manager, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, warehouse.name, warehouse.location, warehouse.manager, now, now]
    );
    return { id, name: warehouse.name, location: warehouse.location, manager: warehouse.manager, stock: 0, value: 0 };
  }

  const newWarehouse: Warehouse = { id, name: warehouse.name, location: warehouse.location, manager: warehouse.manager, stock: 0, value: 0 };
  getMemoryStore().warehouses.push(newWarehouse);
  return newWarehouse;
}

export async function deleteWarehouse(id: string): Promise<{ success: boolean }> {
  if (await useDatabase()) {
    await execute("DELETE FROM products WHERE warehouse_id = $1", [id]);
    await execute("DELETE FROM warehouses WHERE id = $1", [id]);
    return { success: true };
  }

  const store = getMemoryStore();
  const idx = store.warehouses.findIndex((w) => w.id === id);
  if (idx === -1) return { success: false };
  store.warehouses.splice(idx, 1);
  store.products = store.products.filter((p) => p.warehouseId !== id);
  return { success: true };
}

// ------------------------------------------------------------
// 产品操作
// ------------------------------------------------------------
function mapProductFromRow(p: any): Product {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    nameZh: p.name_zh,
    category: p.category,
    brand: p.brand,
    images: p.images || [],
    description: p.description,
    descriptionZh: p.description_zh,
    costPrice: parseFloat(p.cost_price) || 0,
    wholesalePrice: parseFloat(p.wholesale_price) || 0,
    retailPrice: parseFloat(p.retail_price) || 0,
    stock: p.stock || 0,
    warehouse: p.warehouse_name || "",
    warehouseId: p.warehouse_id || "",
    status: p.status,
    levelAPrice: parseFloat(p.level_a_price) || 0,
    levelBPrice: parseFloat(p.level_b_price) || 0,
    levelCPrice: parseFloat(p.level_c_price) || 0,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  if (await useDatabase()) {
    const rows: any[] = await query("SELECT * FROM products ORDER BY created_at DESC");
    return rows.map(mapProductFromRow);
  }
  return getMemoryStore().products;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (await useDatabase()) {
    const row: any = await queryOne("SELECT * FROM products WHERE id = $1", [id]);
    if (!row) return null;
    return mapProductFromRow(row);
  }
  return getMemoryStore().products.find((p) => p.id === id) || null;
}

export async function createOrUpdateProduct(product: Product): Promise<Product> {
  const now = new Date().toISOString();

  if (await useDatabase()) {
    const existing = await getProductById(product.id);

    if (existing) {
      await execute(
        `UPDATE products SET sku=$1, name=$2, name_zh=$3, category=$4, brand=$5,
         images=$6, description=$7, description_zh=$8, cost_price=$9, wholesale_price=$10,
         retail_price=$11, stock=$12, warehouse_id=$13, warehouse_name=$14, status=$15,
         level_a_price=$16, level_b_price=$17, level_c_price=$18, updated_at=$19
         WHERE id=$20`,
        [
          product.sku, product.name, product.nameZh, product.category, product.brand,
          JSON.stringify(product.images), product.description, product.descriptionZh,
          product.costPrice, product.wholesalePrice, product.retailPrice, product.stock,
          product.warehouseId, product.warehouse, product.status, product.levelAPrice,
          product.levelBPrice, product.levelCPrice, now, product.id
        ]
      );
    } else {
      await execute(
        `INSERT INTO products (id, sku, name, name_zh, category, brand, images, description,
         description_zh, cost_price, wholesale_price, retail_price, stock, warehouse_id,
         warehouse_name, status, level_a_price, level_b_price, level_c_price, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          product.id, product.sku, product.name, product.nameZh, product.category,
          product.brand, JSON.stringify(product.images), product.description,
          product.descriptionZh, product.costPrice, product.wholesalePrice,
          product.retailPrice, product.stock, product.warehouseId, product.warehouse,
          product.status, product.levelAPrice, product.levelBPrice, product.levelCPrice,
          now, now
        ]
      );
    }
    return product;
  }

  const store = getMemoryStore();
  const idx = store.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    store.products[idx] = product;
  } else {
    store.products.unshift(product);
  }
  return product;
}

export async function deleteProduct(id: string): Promise<{ success: boolean; deleted?: Product; cleanedLogs?: number }> {
  if (await useDatabase()) {
    const productData: any = await queryOne("SELECT * FROM products WHERE id = $1", [id]);
    if (!productData) return { success: false };

    await execute("DELETE FROM products WHERE id = $1", [id]);
    await execute("DELETE FROM inventory_logs WHERE product_id = $1", [id]);

    return { success: true, deleted: mapProductFromRow(productData), cleanedLogs: 0 };
  }

  const store = getMemoryStore();
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return { success: false };

  const deleted = store.products.splice(idx, 1)[0];
  const before = store.inventoryLogs.length;
  store.inventoryLogs = store.inventoryLogs.filter((l) => l.productId !== id);
  return { success: true, deleted, cleanedLogs: before - store.inventoryLogs.length };
}

export async function updateProductStock(productId: string, newStock: number): Promise<Product | null> {
  if (await useDatabase()) {
    await execute("UPDATE products SET stock = $1, updated_at = $2 WHERE id = $3", [newStock, new Date().toISOString(), productId]);
    return await getProductById(productId);
  }

  const store = getMemoryStore();
  const idx = store.products.findIndex((p) => p.id === productId);
  if (idx === -1) return null;
  store.products[idx].stock = newStock;
  return store.products[idx];
}

// ------------------------------------------------------------
// 代理商操作
// ------------------------------------------------------------
function mapAgentFromRow(a: any): Agent {
  return {
    id: a.id,
    company: a.company,
    contact: a.contact,
    email: a.email,
    phone: a.phone,
    country: a.country,
    level: a.level,
    status: a.status,
    creditLimit: parseFloat(a.credit_limit) || 0,
    outstanding: parseFloat(a.outstanding) || 0,
    availableCredit: (parseFloat(a.credit_limit) || 0) - (parseFloat(a.outstanding) || 0),
    joinDate: a.join_date,
  };
}

export async function getAllAgents(): Promise<Agent[]> {
  if (await useDatabase()) {
    const rows: any[] = await query("SELECT * FROM agents ORDER BY created_at DESC");
    return rows.map(mapAgentFromRow);
  }
  return getMemoryStore().agents;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  if (await useDatabase()) {
    const row: any = await queryOne("SELECT * FROM agents WHERE id = $1", [id]);
    if (!row) return null;
    return mapAgentFromRow(row);
  }
  return getMemoryStore().agents.find((a: any) => a.id === id) || null;
}

export async function getAgentByEmail(email: string, password?: string): Promise<Agent | null> {
  if (await useDatabase()) {
    const row: any = await queryOne("SELECT * FROM agents WHERE email = $1", [email]);
    if (!row) return null;
    if (password && row.password !== password) return null;
    return mapAgentFromRow(row);
  }
  const store = getMemoryStore();
  return store.agents.find((a: any) => a.email === email && (password ? a.password === password : true)) || null;
}

export async function createAgent(agent: Omit<Agent, "id" | "availableCredit" | "joinDate"> & {
  id?: string;
  password?: string;
  joinDate?: string;
}): Promise<Agent> {
  const id = agent.id || `a${Date.now()}`;
  const now = new Date().toISOString();

  if (await useDatabase()) {
    await execute(
      `INSERT INTO agents (id, company, contact, email, password, phone, country, level,
       status, credit_limit, outstanding, join_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id, agent.company, agent.contact || agent.company, agent.email,
        agent.password || "agent123", agent.phone, agent.country, agent.level || "B",
        agent.status || "active", agent.creditLimit, agent.outstanding || 0,
        agent.joinDate || now.split("T")[0], now, now
      ]
    );
    return {
      id, company: agent.company, contact: agent.contact || agent.company, email: agent.email,
      phone: agent.phone, country: agent.country, level: agent.level || "B",
      status: agent.status || "active", creditLimit: agent.creditLimit,
      outstanding: agent.outstanding || 0, availableCredit: agent.creditLimit - (agent.outstanding || 0),
      joinDate: agent.joinDate || now,
    };
  }

  const store = getMemoryStore();
  const newAgent: any = {
    id, company: agent.company, contact: agent.contact || agent.company, email: agent.email,
    password: agent.password || "agent123", phone: agent.phone, country: agent.country,
    level: agent.level || "B", status: agent.status || "active", creditLimit: agent.creditLimit,
    outstanding: agent.outstanding || 0, joinDate: agent.joinDate || now,
  };
  store.agents.push(newAgent);
  return {
    id, company: agent.company, contact: agent.contact || agent.company, email: agent.email,
    phone: agent.phone, country: agent.country, level: agent.level || "B",
    status: agent.status || "active", creditLimit: agent.creditLimit, outstanding: agent.outstanding || 0,
    availableCredit: agent.creditLimit - (agent.outstanding || 0), joinDate: agent.joinDate || now,
  };
}

export async function updateAgent(id: string, updates: any): Promise<Agent | null> {
  if (await useDatabase()) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.company !== undefined) { setClauses.push(`company = $${paramIndex++}`); values.push(updates.company); }
    if (updates.contact !== undefined) { setClauses.push(`contact = $${paramIndex++}`); values.push(updates.contact); }
    if (updates.email !== undefined) { setClauses.push(`email = $${paramIndex++}`); values.push(updates.email); }
    if (updates.phone !== undefined) { setClauses.push(`phone = $${paramIndex++}`); values.push(updates.phone); }
    if (updates.country !== undefined) { setClauses.push(`country = $${paramIndex++}`); values.push(updates.country); }
    if (updates.level !== undefined) { setClauses.push(`level = $${paramIndex++}`); values.push(updates.level); }
    if (updates.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(updates.status); }
    if (updates.creditLimit !== undefined) { setClauses.push(`credit_limit = $${paramIndex++}`); values.push(updates.creditLimit); }
    if (updates.outstanding !== undefined) { setClauses.push(`outstanding = $${paramIndex++}`); values.push(updates.outstanding); }
    if (updates.password !== undefined) { setClauses.push(`password = $${paramIndex++}`); values.push(updates.password); }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await execute(
      `UPDATE agents SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
    return await getAgentById(id);
  }

  const store = getMemoryStore();
  const idx = store.agents.findIndex((a: any) => a.id === id);
  if (idx === -1) return null;
  store.agents[idx] = { ...store.agents[idx], ...updates };
  return await getAgentById(id);
}

export async function deleteAgent(id: string): Promise<{ success: boolean }> {
  if (await useDatabase()) {
    await execute("DELETE FROM credit_transactions WHERE agent_id = $1", [id]);
    await execute("DELETE FROM agents WHERE id = $1", [id]);
    return { success: true };
  }

  const store = getMemoryStore();
  store.agents = store.agents.filter((a: any) => a.id !== id);
  delete store.credits[id];
  return { success: true };
}

// ------------------------------------------------------------
// 订单操作
// ------------------------------------------------------------
function mapOrderFromRow(o: any): Order {
  return {
    id: o.id,
    orderNo: o.order_no,
    agentId: o.agent_id,
    items: o.items || [],
    total: parseFloat(o.total) || 0,
    status: o.status,
    date: o.date,
    shippingAddress: o.shipping_address || "",
    postalCode: o.postal_code || "",
    country: o.country || "",
    contactName: o.contact_name || "",
    phone: o.phone || "",
    email: o.email || "",
    notes: o.notes || "",
    trackingNumber: o.tracking_number,
    company: o.company,
    shippingFee: o.shipping_fee ? parseFloat(o.shipping_fee) : null,
    shippedAt: o.shipped_at,
    trackingImage: o.tracking_image,
  };
}

export async function getAllOrders(): Promise<Order[]> {
  if (await useDatabase()) {
    const rows: any[] = await query("SELECT * FROM orders ORDER BY date DESC");
    return rows.map(mapOrderFromRow);
  }
  return getMemoryStore().orders;
}

export async function getOrdersByAgentId(agentId: string): Promise<Order[]> {
  if (await useDatabase()) {
    const rows: any[] = await query(
      "SELECT * FROM orders WHERE agent_id = $1 ORDER BY date DESC",
      [agentId]
    );
    return rows.map(mapOrderFromRow);
  }
  return getMemoryStore().orders.filter((o) => o.agentId === agentId);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (await useDatabase()) {
    const row: any = await queryOne("SELECT * FROM orders WHERE id = $1", [id]);
    if (!row) return null;
    return mapOrderFromRow(row);
  }
  return getMemoryStore().orders.find((o) => o.id === id) || null;
}

export async function createOrder(order: any): Promise<Order> {
  const id = order.id || `ord_${Date.now()}`;
  const now = new Date().toISOString();

  if (await useDatabase()) {
    await execute(
      `INSERT INTO orders (id, order_no, agent_id, items, total, status, date,
       shipping_address, postal_code, country, contact_name, phone, email, notes,
       tracking_number, company, shipping_fee, shipped_at, tracking_image, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        id, order.orderNo, order.agentId, JSON.stringify(order.items || []),
        order.total, order.status || "pending_review", order.date || now,
        order.shippingAddress || "", order.postalCode || "", order.country || "",
        order.contactName || "", order.phone || "", order.email || "",
        order.notes || "", order.trackingNumber || null, order.company || null,
        order.shippingFee || null, order.shippedAt || null, order.trackingImage || null,
        now, now
      ]
    );
  } else {
    const store = getMemoryStore();
    store.orders.unshift({
      id, orderNo: order.orderNo, agentId: order.agentId, items: order.items || [],
      total: order.total, status: order.status || "pending_review", date: order.date || now,
      shippingAddress: order.shippingAddress || "", postalCode: order.postalCode || "",
      country: order.country || "", contactName: order.contactName || "",
      phone: order.phone || "", email: order.email || "", notes: order.notes || "",
      trackingNumber: order.trackingNumber || null, company: order.company || null,
      shippingFee: order.shippingFee || null, shippedAt: order.shippedAt || null,
      trackingImage: order.trackingImage || null,
    });
  }

  return {
    id, orderNo: order.orderNo, agentId: order.agentId, items: order.items || [],
    total: order.total, status: order.status || "pending_review", date: order.date || now,
    shippingAddress: order.shippingAddress || "", postalCode: order.postalCode || "",
    country: order.country || "", contactName: order.contactName || "",
    phone: order.phone || "", email: order.email || "", notes: order.notes || "",
    trackingNumber: order.trackingNumber || null, company: order.company || null,
    shippingFee: order.shippingFee || null, shippedAt: order.shippedAt || null,
    trackingImage: order.trackingImage || null,
  };
}

export async function updateOrder(id: string, updates: any): Promise<Order | null> {
  if (await useDatabase()) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.orderNo !== undefined) { setClauses.push(`order_no = $${paramIndex++}`); values.push(updates.orderNo); }
    if (updates.agentId !== undefined) { setClauses.push(`agent_id = $${paramIndex++}`); values.push(updates.agentId); }
    if (updates.items !== undefined) { setClauses.push(`items = $${paramIndex++}`); values.push(JSON.stringify(updates.items)); }
    if (updates.total !== undefined) { setClauses.push(`total = $${paramIndex++}`); values.push(updates.total); }
    if (updates.status !== undefined) { setClauses.push(`status = $${paramIndex++}`); values.push(updates.status); }
    if (updates.shippingAddress !== undefined) { setClauses.push(`shipping_address = $${paramIndex++}`); values.push(updates.shippingAddress); }
    if (updates.postalCode !== undefined) { setClauses.push(`postal_code = $${paramIndex++}`); values.push(updates.postalCode); }
    if (updates.country !== undefined) { setClauses.push(`country = $${paramIndex++}`); values.push(updates.country); }
    if (updates.contactName !== undefined) { setClauses.push(`contact_name = $${paramIndex++}`); values.push(updates.contactName); }
    if (updates.phone !== undefined) { setClauses.push(`phone = $${paramIndex++}`); values.push(updates.phone); }
    if (updates.email !== undefined) { setClauses.push(`email = $${paramIndex++}`); values.push(updates.email); }
    if (updates.notes !== undefined) { setClauses.push(`notes = $${paramIndex++}`); values.push(updates.notes); }
    if (updates.trackingNumber !== undefined) { setClauses.push(`tracking_number = $${paramIndex++}`); values.push(updates.trackingNumber); }
    if (updates.company !== undefined) { setClauses.push(`company = $${paramIndex++}`); values.push(updates.company); }
    if (updates.shippingFee !== undefined) { setClauses.push(`shipping_fee = $${paramIndex++}`); values.push(updates.shippingFee); }
    if (updates.shippedAt !== undefined) { setClauses.push(`shipped_at = $${paramIndex++}`); values.push(updates.shippedAt); }
    if (updates.trackingImage !== undefined) { setClauses.push(`tracking_image = $${paramIndex++}`); values.push(updates.trackingImage); }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await execute(
      `UPDATE orders SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
    return await getOrderById(id);
  }

  const store = getMemoryStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  store.orders[idx] = { ...store.orders[idx], ...updates };
  return store.orders[idx];
}

export async function deleteOrder(id: string): Promise<{ success: boolean }> {
  if (await useDatabase()) {
    await execute("DELETE FROM orders WHERE id = $1", [id]);
    return { success: true };
  }

  const store = getMemoryStore();
  store.orders = store.orders.filter((o) => o.id !== id);
  return { success: true };
}

// ------------------------------------------------------------
// 信用额度操作
// ------------------------------------------------------------
export async function getAllCredits(): Promise<CreditRecord[]> {
  if (await useDatabase()) {
    const agentsRows: any[] = await query("SELECT * FROM agents");

    const credits: CreditRecord[] = [];
    for (const agent of agentsRows || []) {
      const transactionsRows: any[] = await query(
        "SELECT * FROM credit_transactions WHERE agent_id = $1 ORDER BY time DESC",
        [agent.id]
      );

      credits.push({
        agentId: agent.id, company: agent.company,
        creditLimit: parseFloat(agent.credit_limit) || 0,
        outstanding: parseFloat(agent.outstanding) || 0,
        available: (parseFloat(agent.credit_limit) || 0) - (parseFloat(agent.outstanding) || 0),
        transactions: (transactionsRows || []).map((t: any) => ({
          id: t.id, type: t.type, amount: parseFloat(t.amount) || 0,
          balance: parseFloat(t.balance) || 0, note: t.note, time: t.time,
        })),
      });
    }
    return credits;
  }

  const store = getMemoryStore();
  const result: CreditRecord[] = [];
  for (const agent of store.agents) {
    const cr = store.credits[agent.id];
    if (cr) {
      result.push({
        agentId: cr.agentId, company: cr.company, creditLimit: cr.creditLimit,
        outstanding: cr.outstanding, available: cr.creditLimit - cr.outstanding,
        transactions: cr.transactions || [],
      });
    } else {
      result.push({
        agentId: agent.id, company: agent.company, creditLimit: agent.creditLimit,
        outstanding: agent.outstanding || 0, available: agent.creditLimit - (agent.outstanding || 0),
        transactions: [],
      });
    }
  }
  return result;
}

export async function getCreditByAgentId(agentId: string): Promise<CreditRecord | null> {
  if (await useDatabase()) {
    const agent: any = await queryOne("SELECT * FROM agents WHERE id = $1", [agentId]);
    if (!agent) return null;

    const transactionsRows: any[] = await query(
      "SELECT * FROM credit_transactions WHERE agent_id = $1 ORDER BY time DESC",
      [agentId]
    );

    return {
      agentId: agent.id, company: agent.company,
      creditLimit: parseFloat(agent.credit_limit) || 0,
      outstanding: parseFloat(agent.outstanding) || 0,
      available: (parseFloat(agent.credit_limit) || 0) - (parseFloat(agent.outstanding) || 0),
      transactions: (transactionsRows || []).map((t: any) => ({
        id: t.id, type: t.type, amount: parseFloat(t.amount) || 0,
        balance: parseFloat(t.balance) || 0, note: t.note, time: t.time,
      })),
    };
  }
  const store = getMemoryStore();
  return store.credits[agentId] || null;
}

export async function deductCredit(agentId: string, amount: number, note: string): Promise<CreditRecord> {
  if (await useDatabase()) {
    const agent: any = await queryOne("SELECT * FROM agents WHERE id = $1", [agentId]);
    if (!agent) throw new Error("Agent not found");

    const creditLimit = parseFloat(agent.credit_limit) || 0;
    const outstanding = parseFloat(agent.outstanding) || 0;
    const available = creditLimit - outstanding;

    if (available < amount) {
      throw new Error("Insufficient credit");
    }

    const newOutstanding = outstanding + amount;
    const newAvailable = creditLimit - newOutstanding;

    await execute(
      "UPDATE agents SET outstanding = $1, updated_at = $2 WHERE id = $3",
      [newOutstanding, new Date().toISOString(), agentId]
    );

    const txnId = `txn_${Date.now()}`;
    await execute(
      `INSERT INTO credit_transactions (id, agent_id, type, amount, balance, note, time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [txnId, agentId, "order_deduct", -amount, newAvailable, note, new Date().toISOString()]
    );

    const transactionsRows: any[] = await query(
      "SELECT * FROM credit_transactions WHERE agent_id = $1 ORDER BY time DESC",
      [agentId]
    );

    return {
      agentId, company: agent.company, creditLimit,
      outstanding: newOutstanding, available: newAvailable,
      transactions: (transactionsRows || []).map((t: any) => ({
        id: t.id, type: t.type, amount: parseFloat(t.amount) || 0,
        balance: parseFloat(t.balance) || 0, note: t.note, time: t.time,
      })),
    };
  }

  const store = getMemoryStore();
  let record = store.credits[agentId];
  if (!record) {
    const agent = store.agents.find((a: any) => a.id === agentId);
    if (!agent) throw new Error("Agent not found");
    record = {
      agentId, company: agent.company, creditLimit: agent.creditLimit,
      outstanding: agent.outstanding || 0,
      available: agent.creditLimit - (agent.outstanding || 0), transactions: [],
    };
    store.credits[agentId] = record;
  }

  if (record.available < amount) throw new Error("Insufficient credit");
  record.outstanding += amount;
  record.available = record.creditLimit - record.outstanding;
  record.transactions.unshift({
    id: `txn_${Date.now()}`, type: "order_deduct", amount: -amount, balance: record.available,
    note, time: new Date().toISOString(),
  });
  return record;
}

export async function repayCredit(agentId: string, amount: number, note: string): Promise<CreditRecord> {
  if (await useDatabase()) {
    const agent: any = await queryOne("SELECT * FROM agents WHERE id = $1", [agentId]);
    if (!agent) throw new Error("Agent not found");

    const outstanding = parseFloat(agent.outstanding) || 0;
    const creditLimit = parseFloat(agent.credit_limit) || 0;
    const newOutstanding = Math.max(0, outstanding - amount);
    const newAvailable = creditLimit - newOutstanding;

    await execute(
      "UPDATE agents SET outstanding = $1, updated_at = $2 WHERE id = $3",
      [newOutstanding, new Date().toISOString(), agentId]
    );

    const txnId = `txn_${Date.now()}`;
    await execute(
      `INSERT INTO credit_transactions (id, agent_id, type, amount, balance, note, time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [txnId, agentId, "repayment", amount, newAvailable, note, new Date().toISOString()]
    );

    const transactionsRows: any[] = await query(
      "SELECT * FROM credit_transactions WHERE agent_id = $1 ORDER BY time DESC",
      [agentId]
    );

    return {
      agentId, company: agent.company, creditLimit,
      outstanding: newOutstanding, available: newAvailable,
      transactions: (transactionsRows || []).map((t: any) => ({
        id: t.id, type: t.type, amount: parseFloat(t.amount) || 0,
        balance: parseFloat(t.balance) || 0, note: t.note, time: t.time,
      })),
    };
  }

  const store = getMemoryStore();
  let record = store.credits[agentId];
  if (!record) {
    const agent = store.agents.find((a: any) => a.id === agentId);
    if (!agent) throw new Error("Agent not found");
    record = {
      agentId, company: agent.company, creditLimit: agent.creditLimit,
      outstanding: agent.outstanding || 0,
      available: agent.creditLimit - (agent.outstanding || 0), transactions: [],
    };
    store.credits[agentId] = record;
  }

  record.outstanding = Math.max(0, record.outstanding - amount);
  record.available = record.creditLimit - record.outstanding;
  record.transactions.unshift({
    id: `txn_${Date.now()}`, type: "repayment", amount, balance: record.available,
    note, time: new Date().toISOString(),
  });
  return record;
}

export async function setCreditLimit(agentId: string, newLimit: number, note: string): Promise<CreditRecord> {
  if (await useDatabase()) {
    const agent: any = await queryOne("SELECT * FROM agents WHERE id = $1", [agentId]);
    if (!agent) throw new Error("Agent not found");

    const outstanding = parseFloat(agent.outstanding) || 0;
    const creditLimit = parseFloat(agent.credit_limit) || 0;
    const newAvailable = newLimit - outstanding;

    await execute(
      "UPDATE agents SET credit_limit = $1, updated_at = $2 WHERE id = $3",
      [newLimit, new Date().toISOString(), agentId]
    );

    const txnId = `txn_${Date.now()}`;
    await execute(
      `INSERT INTO credit_transactions (id, agent_id, type, amount, balance, note, time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [txnId, agentId, "admin_set_limit", newLimit - creditLimit, newAvailable, note, new Date().toISOString()]
    );

    const transactionsRows: any[] = await query(
      "SELECT * FROM credit_transactions WHERE agent_id = $1 ORDER BY time DESC",
      [agentId]
    );

    return {
      agentId, company: agent.company, creditLimit: newLimit,
      outstanding, available: newAvailable,
      transactions: (transactionsRows || []).map((t: any) => ({
        id: t.id, type: t.type, amount: parseFloat(t.amount) || 0,
        balance: parseFloat(t.balance) || 0, note: t.note, time: t.time,
      })),
    };
  }

  const store = getMemoryStore();
  let record = store.credits[agentId];
  if (!record) {
    const agent = store.agents.find((a: any) => a.id === agentId);
    if (!agent) throw new Error("Agent not found");
    record = {
      agentId, company: agent.company, creditLimit: newLimit,
      outstanding: agent.outstanding || 0,
      available: newLimit - (agent.outstanding || 0), transactions: [],
    };
    store.credits[agentId] = record;
  }

  record.creditLimit = newLimit;
  record.available = newLimit - record.outstanding;
  record.transactions.unshift({
    id: `txn_${Date.now()}`, type: "admin_set_limit", amount: newLimit - record.creditLimit,
    balance: record.available, note, time: new Date().toISOString(),
  });
  return record;
}

// ------------------------------------------------------------
// 库存日志操作
// ------------------------------------------------------------
export async function getAllInventoryLogs(): Promise<InventoryLog[]> {
  if (await useDatabase()) {
    const rows: any[] = await query("SELECT * FROM inventory_logs ORDER BY time DESC");
    return (rows || []).map((l: any) => ({
      id: l.id, type: l.type, productId: l.product_id, productName: l.product_name,
      sku: l.sku, warehouse: l.warehouse, qty: l.qty, stockBefore: l.stock_before,
      stockAfter: l.stock_after, operator: l.operator, time: l.time, note: l.note,
      fromWarehouse: l.from_warehouse, toWarehouse: l.to_warehouse,
    }));
  }
  return getMemoryStore().inventoryLogs;
}

export async function addInventoryLog(log: any): Promise<InventoryLog> {
  const id = log.id || `log_${Date.now()}`;
  const now = new Date().toISOString();

  if (await useDatabase()) {
    await execute(
      `INSERT INTO inventory_logs (id, type, product_id, product_name, sku, warehouse,
       qty, stock_before, stock_after, operator, time, note, from_warehouse, to_warehouse)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id, log.type, log.productId, log.productName, log.sku, log.warehouse,
        log.qty, log.stockBefore, log.stockAfter, log.operator || "Admin",
        log.time || now, log.note || "", log.fromWarehouse, log.toWarehouse
      ]
    );
  } else {
    const store = getMemoryStore();
    store.inventoryLogs.unshift({
      id, type: log.type as any, productId: log.productId, productName: log.productName,
      sku: log.sku, warehouse: log.warehouse || null, qty: log.qty, stockBefore: log.stockBefore,
      stockAfter: log.stockAfter, operator: log.operator || "Admin", time: log.time || now,
      note: log.note || "", fromWarehouse: log.fromWarehouse, toWarehouse: log.toWarehouse,
    });
  }

  return {
    id, type: log.type as any, productId: log.productId, productName: log.productName,
    sku: log.sku, warehouse: log.warehouse || null, qty: log.qty, stockBefore: log.stockBefore,
    stockAfter: log.stockAfter, operator: log.operator || "Admin", time: log.time || now,
    note: log.note || "", fromWarehouse: log.fromWarehouse, toWarehouse: log.toWarehouse,
  };
}

// ------------------------------------------------------------
// 员工操作
// ------------------------------------------------------------
function mapEmployeeFromRow(e: any): Employee {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    permissions: e.permissions || {},
    active: e.active,
    createdAt: e.created_at,
  };
}

export async function getAllEmployees(): Promise<Employee[]> {
  if (await useDatabase()) {
    const rows: any[] = await query("SELECT * FROM employees ORDER BY created_at DESC");
    return rows.map(mapEmployeeFromRow);
  }
  return getMemoryStore().employees;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  if (await useDatabase()) {
    const row: any = await queryOne("SELECT * FROM employees WHERE id = $1", [id]);
    if (!row) return null;
    return mapEmployeeFromRow(row);
  }
  return getMemoryStore().employees.find((e) => e.id === id) || null;
}

export async function getEmployeeByEmail(email: string, password?: string): Promise<Employee | null> {
  if (await useDatabase()) {
    const row: any = await queryOne("SELECT * FROM employees WHERE email = $1", [email]);
    if (!row) return null;
    if (password && row.password !== password) return null;
    return mapEmployeeFromRow(row);
  }
  const employees = getMemoryStore().employees as any[];
  return employees.find((e) => e.email === email && (password ? e.password === password : true)) || null;
}

export async function createEmployee(employee: any): Promise<Employee> {
  const id = employee.id || `emp_${Date.now()}`;
  const now = new Date().toISOString();
  const active = employee.active !== false;

  if (await useDatabase()) {
    await execute(
      `INSERT INTO employees (id, name, email, password, permissions, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, employee.name, employee.email, employee.password || "admin123",
        JSON.stringify(employee.permissions || {}), active, now
      ]
    );
  } else {
    const store = getMemoryStore();
    store.employees.push({ id, name: employee.name, email: employee.email, password: employee.password || "admin123", permissions: employee.permissions, active, createdAt: now } as any);
  }
  return { id, name: employee.name, email: employee.email, permissions: employee.permissions || {}, active, createdAt: now };
}

export async function updateEmployee(id: string, updates: any): Promise<Employee | null> {
  if (await useDatabase()) {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(updates.name); }
    if (updates.email !== undefined) { setClauses.push(`email = $${paramIndex++}`); values.push(updates.email); }
    if (updates.password !== undefined) { setClauses.push(`password = $${paramIndex++}`); values.push(updates.password); }
    if (updates.permissions !== undefined) { setClauses.push(`permissions = $${paramIndex++}`); values.push(JSON.stringify(updates.permissions)); }
    if (updates.active !== undefined) { setClauses.push(`active = $${paramIndex++}`); values.push(updates.active); }

    if (setClauses.length > 0) {
      values.push(id);
      await execute(
        `UPDATE employees SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
        values
      );
    }
    return await getEmployeeById(id);
  }

  const store = getMemoryStore();
  const employees = store.employees as any[];
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  employees[idx] = { ...employees[idx], ...updates };
  return { ...employees[idx] };
}

export async function deleteEmployee(id: string): Promise<{ success: boolean }> {
  if (await useDatabase()) {
    await execute("DELETE FROM employees WHERE id = $1", [id]);
    return { success: true };
  }
  const store = getMemoryStore();
  const employees = store.employees as any[];
  store.employees = employees.filter((e) => e.id !== id) as any;
  return { success: store.employees.length !== employees.length };
}

// ------------------------------------------------------------
// 系统初始化
// ------------------------------------------------------------
export async function initializeSystem(): Promise<void> {
  if (!await useDatabase()) return;

  try {
    const employees = await getAllEmployees();
    if (employees.length === 0) {
      await createEmployee({
        id: "emp_admin", name: "Administrator", email: "admin@company.com", password: "admin123",
        permissions: {
          dashboard: true, products: true, inventory: true, warehouse: true,
          agents: true, credit: true, orders: true, shipping: true, finance: true,
          analytics: true, notifications: true, employees: true, audit_logs: true, settings: true,
        }, active: true,
      });
      console.log("✅ 默认管理员账号已创建");
    }
  } catch (e) {
    console.warn("系统初始化跳过:", e);
  }
}

// 首次加载时初始化
initializeSystem().catch(() => {});
