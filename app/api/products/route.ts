import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAllProducts, createOrUpdateProduct, getProductById } from "@/lib/repository";
import { requireAuth, requireAdmin, SessionUser } from "@/lib/auth";

// 产品数据是写操作频繁的业务数据，禁用 Next.js App Router 的
// Data Cache / Full Route Cache，避免 GET 返回旧图片 / 旧价格 / 旧库存。
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// GET - 获取所有产品（代理商看不到成本价和其他等级价）
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const products = await getAllProducts();

    let filtered = products;
    if (warehouseId) {
      filtered = filtered.filter((p: any) => p.warehouseId === warehouseId);
    }

    // 代理商看不到成本价和其他等级价格，但需要看到库存和当前等级价格
    if (user.role === "agent") {
      const level = user.level || "B";
      const priceKey = level === "A" ? "levelAPrice" : level === "C" ? "levelCPrice" : "levelBPrice";
      filtered = filtered.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        nameZh: p.nameZh,
        category: p.category,
        brand: p.brand,
        images: p.images,
        description: p.description,
        descriptionZh: p.descriptionZh,
        price: p[priceKey], // 当前等级的价格
        [priceKey]: p[priceKey], // 同时返回等级价格字段供前端使用
        stock: p.stock, // 代理商需要看到库存以便下单
        warehouse: p.warehouse,
        warehouseId: p.warehouseId,
        status: p.status,
        // 不返回 costPrice、wholesalePrice、retailPrice 及其他等级价格
      })) as any;
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}

// POST - 创建或更新产品（仅管理员）
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

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

    // 写操作完成后，立即失效所有可能展示产品的路由缓存
    try {
      revalidateTag("products");
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/products");
      revalidatePath("/admin/inventory");
      revalidatePath("/agent", "layout");
      revalidatePath("/agent/catalog");
      revalidatePath("/agent/dashboard");
      revalidatePath("/agent/orders");
      revalidatePath("/agent/cart");
    } catch (err) {
      console.warn("Products revalidate failed:", err);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
