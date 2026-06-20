import { NextRequest, NextResponse } from "next/server";
import { getAllProducts, createOrUpdateProduct, getProductById } from "@/lib/repository";

// GET - 获取所有产品（支持按仓库筛选）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const products = await getAllProducts();

    if (warehouseId) {
      return NextResponse.json(products.filter((p: any) => p.warehouseId === warehouseId));
    }
    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}

// POST - 创建或更新产品
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id && body.sku) {
      body.id = `p${Date.now()}`;
    }

    if (!body.name && !body.sku) {
      return NextResponse.json({ error: "Product name or SKU is required" }, { status: 400 });
    }

    const product = {
      id: body.id || `p${Date.now()}`,
      sku: body.sku || `SKU-${Date.now()}`,
      name: body.name || "New Product",
      nameZh: body.nameZh || body.name || "",
      category: body.category || "",
      brand: body.brand || "",
      images: body.images || [],
      description: body.description || "",
      descriptionZh: body.descriptionZh || "",
      costPrice: body.costPrice || body.cost_price || 0,
      wholesalePrice: body.wholesalePrice || body.wholesale_price || 0,
      retailPrice: body.retailPrice || body.retail_price || 0,
      stock: body.stock || 0,
      warehouse: body.warehouse || "",
      warehouseId: body.warehouseId || "",
      status: body.status || "active",
      levelAPrice: body.levelAPrice || body.level_a_price || 0,
      levelBPrice: body.levelBPrice || body.level_b_price || 0,
      levelCPrice: body.levelCPrice || body.level_c_price || 0,
    };

    const result = await createOrUpdateProduct(product);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
