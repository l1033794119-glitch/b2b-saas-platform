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
import { supabase, isSupabaseConfigured } from "./supabase";

// ============================================================
// 数据访问层（统一接口，支持双模式存储）
// - Supabase 模式：使用 PostgreSQL 数据库（生产环境/Vercel）
// - 内存存储模式：使用进程内内存存储（Vercel 无文件系统写入权限）
// ============================================================

// 动态检查 Supabase 是否可用（每个请求都会检查）
async function useSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  // 简单的连接测试 - 尝试读取一张表
  try {
    const { error } = await supabase.from("warehouses").select("id", { count: "exact" }).limit(1);
    if (error) {
      // 表不存在或连接问题 - 回退到内存存储
      console.warn("⚠️  Supabase 连接失败，使用内存存储:", error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn("⚠️  Supabase 异常，使用内存存储:", e?.message || String(e));
    return false;
  }
}

// ------------------------------------------------------------
// 内存存储（Vercel Serverless 环境下的后备方案）
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

// 在模块级别初始化内存存储 - 添加一些默认数据
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
  if (await useSupabase()) {
    const { data, error } = await supabase.from("warehouses").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const warehouses = data as any[];
    const enriched: Warehouse[] = [];
    for (const wh of warehouses) {
      const { data: productsData } = await supabase.from("products").select("stock, cost_price").eq("warehouse_id", wh.id);
      const stock = (productsData || []).reduce((sum: number, p: any) => sum + (p.stock || 0), 0);
      const value = (productsData || []).reduce((sum: number, p: any) => sum + (p.stock || 0) * (p.cost_price || 0), 0);
      enriched.push({ id: wh.id, name: wh.name, location: wh.location, manager: wh.manager, stock, value });
    }
    return enriched;
  }
  return getMemoryStore().warehouses;
}

export async function createWarehouse(warehouse: Omit<Warehouse, "id" | "stock" | "value"> & { id?: string }): Promise<Warehouse> {
  const id = warehouse.id || `w${Date.now()}`;
  const now = new Date().toISOString();

  if (await useSupabase()) {
    const { error } = await supabase
      .from("warehouses")
      .insert({ id, name: warehouse.name, location: warehouse.location, manager: warehouse.manager, created_at: now, updated_at: now });
    if (error) throw error;
    return { id, name: warehouse.name, location: warehouse.location, manager: warehouse.manager, stock: 0, value: 0 };
  }

  const newWarehouse: Warehouse = { id, name: warehouse.name, location: warehouse.location, manager: warehouse.manager, stock: 0, value: 0 };
  getMemoryStore().warehouses.push(newWarehouse);
  return newWarehouse;
}

export async function deleteWarehouse(id: string): Promise<{ success: boolean }> {
  if (await useSupabase()) {
    // 删除仓库的产品
    await supabase.from("products").delete().eq("warehouse_id", id);
    // 删除仓库
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  }

  const store = getMemoryStore();
  const idx = store.warehouses.findIndex((w) => w.id === id);
  if (idx === -1) return { success: false };
  store.warehouses.splice(idx, 1);
  // 同时删除相关产品
  store.products = store.products.filter((p) => p.warehouseId !== id);
  return { success: true };
}

// ------------------------------------------------------------
// 产品操作
// ------------------------------------------------------------
function mapProductFromDb(p: any): Product {
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
    costPrice: p.cost_price,
    wholesalePrice: p.wholesale_price,
    retailPrice: p.retail_price,
    stock: p.stock,
    warehouse: p.warehouse_name,
    warehouseId: p.warehouse_id || "",
    status: p.status,
    levelAPrice: p.level_a_price,
    levelBPrice: p.level_b_price,
    levelCPrice: p.level_c_price,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapProductFromDb);
  }
  return getMemoryStore().products;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error || !data) return null;
    return mapProductFromDb(data);
  }
  return getMemoryStore().products.find((p) => p.id === id) || null;
}

export async function createOrUpdateProduct(product: Product): Promise<Product> {
  const now = new Date().toISOString();

  if (await useSupabase()) {
    const existing = await getProductById(product.id);
    const dbProduct = {
      sku: product.sku,
      name: product.name,
      name_zh: product.nameZh,
      category: product.category,
      brand: product.brand,
      images: product.images,
      description: product.description,
      description_zh: product.descriptionZh,
      cost_price: product.costPrice,
      wholesale_price: product.wholesalePrice,
      retail_price: product.retailPrice,
      stock: product.stock,
      warehouse_id: product.warehouseId,
      warehouse_name: product.warehouse,
      status: product.status,
      level_a_price: product.levelAPrice,
      level_b_price: product.levelBPrice,
      level_c_price: product.levelCPrice,
      updated_at: now,
    };

    if (existing) {
      const { error } = await supabase.from("products").update(dbProduct).eq("id", product.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("products").insert({ id: product.id, ...dbProduct, created_at: now });
      if (error) throw error;
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
  if (await useSupabase()) {
    const { data: productData } = await supabase.from("products").select("*").eq("id", id).single();
    if (!productData) return { success: false };

    await supabase.from("products").delete().eq("id", id);
    await supabase.from("inventory_logs").delete().eq("product_id", id);

    return { success: true, deleted: mapProductFromDb(productData), cleanedLogs: 0 };
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
  if (await useSupabase()) {
    const { error } = await supabase.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", productId);
    if (error) throw error;
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
function mapAgentFromDb(a: any): Agent {
  return {
    id: a.id,
    company: a.company,
    contact: a.contact,
    email: a.email,
    phone: a.phone,
    country: a.country,
    level: a.level,
    status: a.status,
    creditLimit: a.credit_limit,
    outstanding: a.outstanding,
    availableCredit: a.credit_limit - a.outstanding,
    joinDate: a.join_date,
  };
}

export async function getAllAgents(): Promise<Agent[]> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapAgentFromDb);
  }
  return getMemoryStore().agents;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();
    if (error || !data) return null;
    return mapAgentFromDb(data);
  }
  return getMemoryStore().agents.find((a) => a.id === id) || null;
}

export async function getAgentByEmail(email: string, password?: string): Promise<Agent | null> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("agents").select("*").eq("email", email).single();
    if (error || !data) return null;
    if (password && data.password !== password) return null;
    return mapAgentFromDb(data);
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

  if (await useSupabase()) {
    const { error } = await supabase.from("agents").insert({
      id,
      company: agent.company,
      contact: agent.contact,
      email: agent.email,
      password: agent.password || "agent123",
      phone: agent.phone,
      country: agent.country,
      level: agent.level,
      status: agent.status || "active",
      credit_limit: agent.creditLimit,
      outstanding: agent.outstanding || 0,
      join_date: agent.joinDate || now,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return {
      id, company: agent.company, contact: agent.contact, email: agent.email,
      phone: agent.phone, country: agent.country, level: agent.level,
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
  if (await useSupabase()) {
    const dbUpdates: any = {};
    if (updates.company) dbUpdates.company = updates.company;
    if (updates.contact) dbUpdates.contact = updates.contact;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.country) dbUpdates.country = updates.country;
    if (updates.level) dbUpdates.level = updates.level;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
    if (updates.outstanding !== undefined) dbUpdates.outstanding = updates.outstanding;
    if (updates.password) dbUpdates.password = updates.password;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from("agents").update(dbUpdates).eq("id", id);
    if (error) throw error;
    return await getAgentById(id);
  }

  const store = getMemoryStore();
  const idx = store.agents.findIndex((a: any) => a.id === id);
  if (idx === -1) return null;
  store.agents[idx] = { ...store.agents[idx], ...updates };
  return await getAgentById(id);
}

export async function deleteAgent(id: string): Promise<{ success: boolean }> {
  if (await useSupabase()) {
    // 先删除信用交易记录，再删除代理商
    await supabase.from("credit_transactions").delete().eq("agent_id", id);
    const { error } = await supabase.from("agents").delete().eq("id", id);
    if (error) throw error;
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
function mapOrderFromDb(o: any): Order {
  return {
    id: o.id, orderNo: o.order_no, agentId: o.agent_id, items: o.items || [],
    total: o.total, status: o.status, date: o.date, shippingAddress: o.shipping_address,
    postalCode: o.postal_code, country: o.country, contactName: o.contact_name,
    phone: o.phone, email: o.email, notes: o.notes, trackingNumber: o.tracking_number,
    company: o.company, shippingFee: o.shipping_fee, shippedAt: o.shipped_at,
  };
}

export async function getAllOrders(): Promise<Order[]> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("orders").select("*").order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapOrderFromDb);
  }
  return getMemoryStore().orders;
}

export async function getOrdersByAgentId(agentId: string): Promise<Order[]> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("orders").select("*").eq("agent_id", agentId).order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapOrderFromDb);
  }
  return getMemoryStore().orders.filter((o) => o.agentId === agentId);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
    if (error || !data) return null;
    return mapOrderFromDb(data);
  }
  return getMemoryStore().orders.find((o) => o.id === id) || null;
}

export async function createOrder(order: any): Promise<Order> {
  const id = order.id || `ord_${Date.now()}`;
  const now = new Date().toISOString();

  if (await useSupabase()) {
    const { error } = await supabase.from("orders").insert({
      id, order_no: order.orderNo, agent_id: order.agentId, items: order.items || [],
      total: order.total, status: order.status || "pending_review", date: order.date || now,
      shipping_address: order.shippingAddress || "", postal_code: order.postalCode || "",
      country: order.country || "", contact_name: order.contactName || "",
      phone: order.phone || "", email: order.email || "", notes: order.notes || "",
      tracking_number: order.trackingNumber || null, company: order.company || null,
      shipping_fee: order.shippingFee || null, shipped_at: order.shippedAt || null,
      created_at: now, updated_at: now,
    });
    if (error) throw error;
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
  };
}

export async function updateOrder(id: string, updates: any): Promise<Order | null> {
  if (await useSupabase()) {
    const dbUpdates: any = {};
    if (updates.orderNo) dbUpdates.order_no = updates.orderNo;
    if (updates.agentId) dbUpdates.agent_id = updates.agentId;
    if (updates.items) dbUpdates.items = updates.items;
    if (updates.total !== undefined) dbUpdates.total = updates.total;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.shippingAddress) dbUpdates.shipping_address = updates.shippingAddress;
    if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.trackingNumber !== undefined) dbUpdates.tracking_number = updates.trackingNumber;
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.shippingFee !== undefined) dbUpdates.shipping_fee = updates.shippingFee;
    if (updates.shippedAt !== undefined) dbUpdates.shipped_at = updates.shippedAt;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from("orders").update(dbUpdates).eq("id", id);
    if (error) throw error;
    return await getOrderById(id);
  }

  const store = getMemoryStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  store.orders[idx] = { ...store.orders[idx], ...updates };
  return store.orders[idx];
}

export async function deleteOrder(id: string): Promise<{ success: boolean }> {
  if (await useSupabase()) {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) throw error;
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
  if (await useSupabase()) {
    const { data: agentsData, error: agentsError } = await supabase.from("agents").select("*");
    if (agentsError) throw agentsError;

    const credits: CreditRecord[] = [];
    for (const agent of agentsData || []) {
      const { data: transactions } = await supabase
        .from("credit_transactions").select("*").eq("agent_id", agent.id).order("time", { ascending: false });

      credits.push({
        agentId: agent.id, company: agent.company, creditLimit: agent.credit_limit,
        outstanding: agent.outstanding, available: agent.credit_limit - agent.outstanding,
        transactions: (transactions || []).map((t: any) => ({
          id: t.id, type: t.type, amount: t.amount, balance: t.balance, note: t.note, time: t.time,
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
        outstanding: agent.outstanding, available: agent.creditLimit - agent.outstanding,
        transactions: [],
      });
    }
  }
  return result;
}

export async function getCreditByAgentId(agentId: string): Promise<CreditRecord | null> {
  if (await useSupabase()) {
    const { data: agent } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (!agent) return null;

    const { data: transactions } = await supabase
      .from("credit_transactions").select("*").eq("agent_id", agentId).order("time", { ascending: false });

    return {
      agentId: agent.id, company: agent.company, creditLimit: agent.credit_limit,
      outstanding: agent.outstanding, available: agent.credit_limit - agent.outstanding,
      transactions: (transactions || []).map((t: any) => ({
        id: t.id, type: t.type, amount: t.amount, balance: t.balance, note: t.note, time: t.time,
      })),
    };
  }
  const store = getMemoryStore();
  return store.credits[agentId] || null;
}

export async function deductCredit(agentId: string, amount: number, note: string): Promise<CreditRecord> {
  if (await useSupabase()) {
    const { data: agent } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (!agent) throw new Error("Agent not found");
    if (agent.credit_limit - agent.outstanding < amount) {
      throw new Error("Insufficient credit");
    }

    const newOutstanding = agent.outstanding + amount;
    const newAvailable = agent.credit_limit - newOutstanding;

    await supabase.from("agents").update({ outstanding: newOutstanding, updated_at: new Date().toISOString() }).eq("id", agentId);

    const txnId = `txn_${Date.now()}`;
    await supabase.from("credit_transactions").insert({
      id: txnId, agent_id: agentId, type: "order_deduct", amount: -amount,
      balance: newAvailable, note, time: new Date().toISOString(),
    });

    const { data: transactions } = await supabase
      .from("credit_transactions").select("*").eq("agent_id", agentId).order("time", { ascending: false });

    return {
      agentId, company: agent.company, creditLimit: agent.credit_limit, outstanding: newOutstanding,
      available: newAvailable, transactions: (transactions || []).map((t: any) => ({
        id: t.id, type: t.type, amount: t.amount, balance: t.balance, note: t.note, time: t.time,
      })),
    };
  }

  const store = getMemoryStore();
  let record = store.credits[agentId];
  if (!record) {
    const agent = store.agents.find((a: any) => a.id === agentId);
    if (!agent) throw new Error("Agent not found");
    record = {
      agentId, company: agent.company, creditLimit: agent.creditLimit, outstanding: agent.outstanding || 0,
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
  if (await useSupabase()) {
    const { data: agent } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (!agent) throw new Error("Agent not found");

    const newOutstanding = Math.max(0, agent.outstanding - amount);
    const newAvailable = agent.credit_limit - newOutstanding;

    await supabase.from("agents").update({ outstanding: newOutstanding, updated_at: new Date().toISOString() }).eq("id", agentId);

    const txnId = `txn_${Date.now()}`;
    await supabase.from("credit_transactions").insert({
      id: txnId, agent_id: agentId, type: "repayment", amount, balance: newAvailable, note, time: new Date().toISOString(),
    });

    const { data: transactions } = await supabase
      .from("credit_transactions").select("*").eq("agent_id", agentId).order("time", { ascending: false });

    return {
      agentId, company: agent.company, creditLimit: agent.credit_limit, outstanding: newOutstanding,
      available: newAvailable, transactions: (transactions || []).map((t: any) => ({
        id: t.id, type: t.type, amount: t.amount, balance: t.balance, note: t.note, time: t.time,
      })),
    };
  }

  const store = getMemoryStore();
  let record = store.credits[agentId];
  if (!record) {
    const agent = store.agents.find((a: any) => a.id === agentId);
    if (!agent) throw new Error("Agent not found");
    record = {
      agentId, company: agent.company, creditLimit: agent.creditLimit, outstanding: agent.outstanding || 0,
      available: agent.creditLimit - (agent.outstanding || 0), transactions: [],
    };
    store.credits[agentId] = record;
  }

  record.outstanding = Math.max(0, record.outstanding - amount);
  record.available = record.creditLimit - record.outstanding;
  record.transactions.unshift({
    id: `txn_${Date.now()}`, type: "repayment", amount, balance: record.available, note, time: new Date().toISOString(),
  });
  return record;
}

export async function setCreditLimit(agentId: string, newLimit: number, note: string): Promise<CreditRecord> {
  if (await useSupabase()) {
    const { data: agent } = await supabase.from("agents").select("*").eq("id", agentId).single();
    if (!agent) throw new Error("Agent not found");

    await supabase.from("agents").update({ credit_limit: newLimit, updated_at: new Date().toISOString() }).eq("id", agentId);
    const newAvailable = newLimit - agent.outstanding;

    const txnId = `txn_${Date.now()}`;
    await supabase.from("credit_transactions").insert({
      id: txnId, agent_id: agentId, type: "admin_set_limit",
      amount: newLimit - agent.credit_limit, balance: newAvailable, note, time: new Date().toISOString(),
    });

    const { data: transactions } = await supabase
      .from("credit_transactions").select("*").eq("agent_id", agentId).order("time", { ascending: false });

    return {
      agentId, company: agent.company, creditLimit: newLimit, outstanding: agent.outstanding,
      available: newAvailable, transactions: (transactions || []).map((t: any) => ({
        id: t.id, type: t.type, amount: t.amount, balance: t.balance, note: t.note, time: t.time,
      })),
    };
  }

  const store = getMemoryStore();
  let record = store.credits[agentId];
  if (!record) {
    const agent = store.agents.find((a: any) => a.id === agentId);
    if (!agent) throw new Error("Agent not found");
    record = {
      agentId, company: agent.company, creditLimit: newLimit, outstanding: agent.outstanding || 0,
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
  if (await useSupabase()) {
    const { data, error } = await supabase.from("inventory_logs").select("*").order("time", { ascending: false });
    if (error) throw error;
    return (data || []).map((l: any) => ({
      id: l.id, type: l.type, productId: l.product_id, productName: l.product_name, sku: l.sku,
      warehouse: l.warehouse, qty: l.qty, stockBefore: l.stock_before, stockAfter: l.stock_after,
      operator: l.operator, time: l.time, note: l.note, fromWarehouse: l.from_warehouse, toWarehouse: l.to_warehouse,
    }));
  }
  return getMemoryStore().inventoryLogs;
}

export async function addInventoryLog(log: any): Promise<InventoryLog> {
  const id = log.id || `log_${Date.now()}`;
  const now = new Date().toISOString();

  if (await useSupabase()) {
    const { error } = await supabase.from("inventory_logs").insert({
      id, type: log.type, product_id: log.productId, product_name: log.productName, sku: log.sku,
      warehouse: log.warehouse, qty: log.qty, stock_before: log.stockBefore, stock_after: log.stockAfter,
      operator: log.operator || "Admin", time: log.time || now, note: log.note || "",
      from_warehouse: log.fromWarehouse, to_warehouse: log.toWarehouse,
    });
    if (error) throw error;
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
export async function getAllEmployees(): Promise<Employee[]> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((e: any) => ({
      id: e.id, name: e.name, email: e.email, permissions: e.permissions,
      active: e.active, createdAt: e.created_at,
    }));
  }
  return getMemoryStore().employees;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("employees").select("*").eq("id", id).single();
    if (error || !data) return null;
    const e: any = data;
    return { id: e.id, name: e.name, email: e.email, permissions: e.permissions, active: e.active, createdAt: e.created_at };
  }
  return getMemoryStore().employees.find((e) => e.id === id) || null;
}

export async function getEmployeeByEmail(email: string, password?: string): Promise<Employee | null> {
  if (await useSupabase()) {
    const { data, error } = await supabase.from("employees").select("*").eq("email", email).single();
    if (error || !data) return null;
    if (password && data.password !== password) return null;
    return { id: data.id, name: data.name, email: data.email, permissions: data.permissions, active: data.active, createdAt: data.created_at };
  }
  const employees = getMemoryStore().employees as any[];
  return employees.find((e) => e.email === email && (password ? e.password === password : true)) || null;
}

export async function createEmployee(employee: any): Promise<Employee> {
  const id = employee.id || `emp_${Date.now()}`;
  const now = new Date().toISOString();
  const active = employee.active !== false;

  if (await useSupabase()) {
    const { error } = await supabase.from("employees").insert({
      id, name: employee.name, email: employee.email, password: employee.password || "admin123",
      permissions: employee.permissions, active, created_at: now,
    });
    if (error) throw error;
  } else {
    const store = getMemoryStore();
    store.employees.push({ id, name: employee.name, email: employee.email, password: employee.password || "admin123", permissions: employee.permissions, active, createdAt: now } as any);
  }
  return { id, name: employee.name, email: employee.email, permissions: employee.permissions, active, createdAt: now };
}

export async function updateEmployee(id: string, updates: any): Promise<Employee | null> {
  if (await useSupabase()) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.password) dbUpdates.password = updates.password;
    if (updates.permissions) dbUpdates.permissions = updates.permissions;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase.from("employees").update(dbUpdates).eq("id", id);
    if (error) throw error;
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
  if (await useSupabase()) {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) throw error;
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
  if (!await useSupabase()) return;

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
