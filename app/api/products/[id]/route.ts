import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { deleteProduct, getProductById } from "@/lib/repository";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// DELETE - 删除产品及相关库存日志（仅管理员）
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await deleteProduct(id);

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
      revalidatePath("/agent/cart");
    } catch (err) {
      console.warn("Product DELETE revalidate failed:", err);
    }

    return NextResponse.json({
      success: result.success,
      deleted: result.deleted || product,
      cleanedLogs: result.cleanedLogs || 0,
    });
  } catch (error: any) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
