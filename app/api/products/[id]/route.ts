import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const INVENTORY_LOGS_FILE = path.join(DATA_DIR, "inventory_logs.json");

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

// DELETE /api/products/[id] - 删除指定产品
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }

  const products = await getProducts();
  const idx = products.findIndex((p: any) => p.id === id);

  if (idx === -1) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const deleted = products.splice(idx, 1)[0];
  await saveProducts(products);

  // 同步清理库存日志中该产品的相关记录
  const logs = await getInventoryLogs();
  const remainingLogs = logs.filter((l: any) => l.productId !== id);
  if (remainingLogs.length !== logs.length) {
    await saveInventoryLogs(remainingLogs);
  }

  return NextResponse.json({
    success: true,
    deleted,
    cleanedLogs: logs.length - remainingLogs.length,
  });
}
