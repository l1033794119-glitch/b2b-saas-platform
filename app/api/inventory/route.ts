import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, updateProductStock, addInventoryLog, getAllInventoryLogs, getProductById } from "@/lib/repository";

// GET - 获取库存概览或库存日志
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "logs") {
      const logs = await getAllInventoryLogs();
      return NextResponse.json(logs);
    }

    // 默认返回产品库存概览
    const products = await getAllProducts();
    const lowStock = products.filter((p: any) => (p.stock || 0) < 100);
    return NextResponse.json({
      products,
      lowStock,
      totalProducts: products.length,
      totalStock: products.reduce((sum: number, p: any) => sum + (p.stock || 0), 0),
      lowStockCount: lowStock.length,
    });
  } catch (error: any) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch inventory" }, { status: 500 });
  }
}

// POST - 执行库存操作（入库/出库/调整）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, productId, qty, note, operator, fromWarehouse, toWarehouse } = body;

    if (!action || !productId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let newStock = product.stock || 0;
    switch (action) {
      case "stock_in":
        newStock = product.stock + qty;
        break;
      case "stock_out":
        newStock = Math.max(0, product.stock - qty);
        break;
      case "adjustment":
        newStock = qty;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 更新库存
    const updatedProduct = await updateProductStock(productId, newStock);

    // 记录操作日志
    const log = await addInventoryLog({
      type: action as any,
      productId,
      productName: product.name,
      sku: product.sku,
      warehouse: product.warehouse || null,
      qty,
      stockBefore: product.stock,
      stockAfter: newStock,
      operator: operator || "Admin",
      note: note || "",
      fromWarehouse,
      toWarehouse,
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      log,
    });
  } catch (error: any) {
    console.error("Inventory POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
