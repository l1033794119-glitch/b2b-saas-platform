import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const WAREHOUSES_FILE = path.join(DATA_DIR, "warehouses.json");
const INVENTORY_LOGS_FILE = path.join(DATA_DIR, "inventory_logs.json");

// PUT /api/warehouses/cleanup-orphans - 删除不归属任何现有仓库的孤儿产品
export async function PUT(req: NextRequest) {
  try {
    const [warehouses, products] = await Promise.all([
      fs.readFile(WAREHOUSES_FILE, "utf-8").then(JSON.parse).catch(() => []),
      fs.readFile(PRODUCTS_FILE, "utf-8").then(JSON.parse).catch(() => []),
    ]);

    const validIds = new Set((warehouses as any[]).map((w) => w.id));
    const validNames = new Set((warehouses as any[]).map((w) => w.name));

    const orphansToDelete = new Set<string>();

    for (const p of products) {
      const pid = p.warehouseId || "";
      const pname = p.warehouse || "";
      if (pid && validIds.has(pid)) continue;
      if (!pid && pname && validNames.has(pname)) continue;
      orphansToDelete.add(p.id);
    }

    if (orphansToDelete.size === 0) {
      return NextResponse.json({ success: true, deletedProducts: 0, deletedLogs: 0 });
    }

    const remainingProducts = products.filter((p: any) => !orphansToDelete.has(p.id));
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(remainingProducts, null, 2));

    const logs = await fs.readFile(INVENTORY_LOGS_FILE, "utf-8")
      .then(JSON.parse).catch(() => []);
    const remainingLogs = logs.filter((l: any) => !orphansToDelete.has(l.productId));
    const logsCount = logs.length - remainingLogs.length;
    await fs.writeFile(INVENTORY_LOGS_FILE, JSON.stringify(remainingLogs, null, 2));

    return NextResponse.json({
      success: true,
      deletedProducts: orphansToDelete.size,
      deletedLogs: logsCount,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
