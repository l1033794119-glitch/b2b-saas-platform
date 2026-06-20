import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, getProductById } from "@/lib/repository";

// DELETE - 删除产品及相关库存日志
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const result = await deleteProduct(id);
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
