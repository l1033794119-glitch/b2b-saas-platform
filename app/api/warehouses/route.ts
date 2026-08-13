import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAllWarehouses, createWarehouse, deleteWarehouse, getAllProducts, getAllInventoryLogs } from "@/lib/repository";
import { requireAuth, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// GET - 获取所有仓库（需登录）
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const warehouses = await getAllWarehouses();
    return NextResponse.json(warehouses);
  } catch (error: any) {
    console.error("Warehouses GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch warehouses" }, { status: 500 });
  }
}

// POST - 创建仓库（仅管理员）
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { name, location, manager } = body;

    if (!name || !location || !manager) {
      return NextResponse.json({ error: "Name, location and manager are required" }, { status: 400 });
    }

    // 检查名称是否已存在
    const warehouses = await getAllWarehouses();
    if (warehouses.some((w: any) => w.name === name)) {
      return NextResponse.json({ error: "Warehouse with this name already exists" }, { status: 400 });
    }

    const warehouse = await createWarehouse({ name, location, manager });

    try {
      revalidateTag("warehouses");
      revalidateTag("products");
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/warehouse");
      revalidatePath("/admin/products");
      revalidatePath("/admin/inventory");
    } catch (err) {
      console.warn("Warehouses POST revalidate failed:", err);
    }

    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: any) {
    console.error("Warehouses POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// DELETE - 删除仓库及其关联的产品和库存日志（仅管理员）
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json().catch(() => ({}));
    const targetWarehouseId = id || body.id;
    const cleanupOrphans = searchParams.get("cleanupOrphans") === "1" || body.cleanupOrphans === true;

    if (!targetWarehouseId) {
      return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
    }

    const warehouses = await getAllWarehouses();
    const warehouse = warehouses.find((w: any) => w.id === targetWarehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    // 计算要删除的产品数量
    const products = await getAllProducts();
    let deletedProductsCount = 0;

    for (const p of products as any[]) {
      if (p.warehouseId === targetWarehouseId || p.warehouse === warehouse.name) {
        deletedProductsCount++;
      }
      if (cleanupOrphans && (!p.warehouseId || p.warehouseId === "")) {
        deletedProductsCount++;
      }
    }

    // 删除仓库（数据库层会自动删除关联的产品和库存日志）
    await deleteWarehouse(targetWarehouseId);

    try {
      revalidateTag("warehouses");
      revalidateTag("products");
      revalidateTag("inventory");
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/warehouse");
      revalidatePath("/admin/products");
      revalidatePath("/admin/inventory");
      revalidatePath("/agent", "layout");
      revalidatePath("/agent/catalog");
      revalidatePath("/agent/dashboard");
    } catch (err) {
      console.warn("Warehouses DELETE revalidate failed:", err);
    }

    return NextResponse.json({
      success: true,
      deletedWarehouse: warehouse.name,
      deletedProducts: deletedProductsCount,
      deletedLogs: 0,
      orphanCleanup: cleanupOrphans,
    });
  } catch (error: any) {
    console.error("Warehouses DELETE error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
