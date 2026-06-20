import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const INVENTORY_LOGS_FILE = path.join(DATA_DIR, "inventory_logs.json");

interface Product {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  category: string;
  brand: string;
  images: string[];
  description: string;
  descriptionZh: string;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  stock: number;
  warehouse: string;
  status: "active" | "out_of_stock" | "disabled";
  levelAPrice: number;
  levelBPrice: number;
  levelCPrice: number;
}

interface InventoryLog {
  id: string;
  type: "stock_in" | "stock_out" | "adjustment" | "transfer";
  productId: string;
  productName: string;
  sku: string;
  warehouse?: string;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  operator: string;
  time: string;
  note: string;
  fromWarehouse?: string;
  toWarehouse?: string;
}

async function getProducts(): Promise<Product[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveProducts(products: Product[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function getInventoryLogs(): Promise<InventoryLog[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(INVENTORY_LOGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveInventoryLogs(logs: InventoryLog[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(INVENTORY_LOGS_FILE, JSON.stringify(logs, null, 2));
}

// GET /api/inventory - 获取所有库存记录
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "logs") {
    const logs = await getInventoryLogs();
    return NextResponse.json(logs);
  }

  // 默认返回产品库存概览
  const products = await getProducts();
  const lowStock = products.filter((p) => p.stock < 100);
  return NextResponse.json({
    products,
    lowStock,
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + p.stock, 0),
    lowStockCount: lowStock.length,
  });
}

// POST /api/inventory - 执行库存操作
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, productId, qty, note, operator, fromWarehouse, toWarehouse } = body;

    if (!action || !productId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const products = await getProducts();
    const productIndex = products.findIndex((p) => p.id === productId);

    if (productIndex === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = products[productIndex];
    const stockBefore = product.stock;
    let stockAfter = stockBefore;

    switch (action) {
      case "stock_in":
        stockAfter = stockBefore + qty;
        break;
      case "stock_out":
        stockAfter = Math.max(0, stockBefore - qty);
        break;
      case "adjustment":
        // 直接设置库存为指定数量
        stockAfter = qty;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 更新产品库存
    products[productIndex] = { ...product, stock: stockAfter };
    await saveProducts(products);

    // 记录库存操作日志
    const logs = await getInventoryLogs();
    const log: InventoryLog = {
      id: `log_${Date.now()}`,
      type: action,
      productId,
      productName: product.name,
      sku: product.sku,
      warehouse: product.warehouse,
      qty,
      stockBefore,
      stockAfter,
      operator: operator || "Admin",
      time: new Date().toISOString(),
      note: note || "",
    };

    logs.unshift(log);
    await saveInventoryLogs(logs);

    return NextResponse.json({
      success: true,
      product: products[productIndex],
      log,
    });
  } catch (error) {
    console.error("Inventory error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
