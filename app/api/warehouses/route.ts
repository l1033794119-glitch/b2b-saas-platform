import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const WAREHOUSES_FILE = path.join(DATA_DIR, "warehouses.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const INVENTORY_LOGS_FILE = path.join(DATA_DIR, "inventory_logs.json");

interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
  stock: number;
  value: number;
}

async function getWarehouses(): Promise<Warehouse[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(WAREHOUSES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveWarehouses(warehouses: Warehouse[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(WAREHOUSES_FILE, JSON.stringify(warehouses, null, 2));
}

async function getProducts(): Promise<any[]> {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveProducts(products: any[]): Promise<void> {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function getInventoryLogs(): Promise<any[]> {
  try {
    const data = await fs.readFile(INVENTORY_LOGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveInventoryLogs(logs: any[]): Promise<void> {
  await fs.writeFile(INVENTORY_LOGS_FILE, JSON.stringify(logs, null, 2));
}

export async function GET(req: NextRequest) {
  const warehouses = await getWarehouses();
  return NextResponse.json(warehouses);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, location, manager } = body;

    if (!name || !location || !manager) {
      return NextResponse.json(
        { error: "Name, location and manager are required" },
        { status: 400 }
      );
    }

    const warehouses = await getWarehouses();

    if (warehouses.some((w) => w.name === name)) {
      return NextResponse.json(
        { error: "Warehouse with this name already exists" },
        { status: 400 }
      );
    }

    const newWarehouse: Warehouse = {
      id: `w${Date.now()}`,
      name,
      location,
      manager,
      stock: 0,
      value: 0,
    };

    warehouses.push(newWarehouse);
    await saveWarehouses(warehouses);
    return NextResponse.json(newWarehouse, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/warehouses?id=xxx - 删除仓库及其关联的产品和库存日志
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json().catch(() => ({}));
    const targetWarehouseId = id || body.id;
    const cleanupOrphans = searchParams.get("cleanupOrphans") === "1" || body.cleanupOrphans === true;

    if (!targetWarehouseId) {
      return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
    }

    const warehouses = await getWarehouses();
    const warehouse = warehouses.find((w) => w.id === targetWarehouseId);

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    // 删除后的仓库列表
    const remainingWarehouses = warehouses.filter((w) => w.id !== targetWarehouseId);
    const remainingWarehouseIds = new Set(remainingWarehouses.map(w => w.id));
    const remainingWarehouseNames = new Set(remainingWarehouses.map(w => w.name));

    // 找到要删除的产品：
    // 1. 直接属于当前仓库的（warehouseId 匹配或 warehouse 名称匹配）
    // 2. cleanupOrphans=true 时：所有孤儿产品（warehouseId 为空或不匹配任何现有仓库）
    const products = await getProducts();
    const productIdsToDelete = new Set<string>();

    for (const p of products) {
      const pid = p.warehouseId || "";
      const pname = p.warehouse || "";

      // 直接归属当前仓库
      if (pid === targetWarehouseId || pname === warehouse.name) {
        productIdsToDelete.add(p.id);
        continue;
      }

      // 孤儿清理：warehouseId 不匹配任何现存仓库
      if (cleanupOrphans) {
        if (pid && !remainingWarehouseIds.has(pid)) {
          productIdsToDelete.add(p.id);
        } else if (!pid && pname && !remainingWarehouseNames.has(pname)) {
          productIdsToDelete.add(p.id);
        } else if (!pid && !pname) {
          productIdsToDelete.add(p.id);
        }
      }
    }

    const productsCount = productIdsToDelete.size;

    // 过滤掉产品
    const remainingProducts = products.filter((p) => !productIdsToDelete.has(p.id));
    await saveProducts(remainingProducts);

    // 过滤掉相关库存日志
    const logs = await getInventoryLogs();
    const remainingLogs = logs.filter((log) => !productIdsToDelete.has(log.productId));
    const logsCount = logs.length - remainingLogs.length;
    await saveInventoryLogs(remainingLogs);

    // 删除仓库
    await saveWarehouses(remainingWarehouses);

    return NextResponse.json({
      success: true,
      deletedWarehouse: warehouse.name,
      deletedProducts: productsCount,
      deletedLogs: logsCount,
      orphanCleanup: cleanupOrphans,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// PUT /api/warehouses/cleanup-orphans - 单独清理孤儿产品（不归属任何仓库的）
export async function PUT(req: NextRequest) {
  try {
    const warehouses = await getWarehouses();
    const validIds = new Set(warehouses.map(w => w.id));
    const validNames = new Set(warehouses.map(w => w.name));

    const products = await getProducts();
    const orphanIds = new Set<string>();

    for (const p of products) {
      const pid = p.warehouseId || "";
      const pname = p.warehouse || "";
      if (pid && !validIds.has(pid)) {
        orphanIds.add(p.id);
      } else if (!pid && pname && !validNames.has(pname)) {
        orphanIds.add(p.id);
      } else if (!pid && !pname) {
        orphanIds.add(p.id);
      }
    }

    if (orphanIds.size === 0) {
      return NextResponse.json({ success: true, deletedProducts: 0, deletedLogs: 0 });
    }

    const remainingProducts = products.filter((p) => !orphanIds.has(p.id));
    await saveProducts(remainingProducts);

    const logs = await getInventoryLogs();
    const remainingLogs = logs.filter((log) => !orphanIds.has(log.productId));
    const logsCount = logs.length - remainingLogs.length;
    await saveInventoryLogs(remainingLogs);

    return NextResponse.json({
      success: true,
      deletedProducts: orphanIds.size,
      deletedLogs: logsCount,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
