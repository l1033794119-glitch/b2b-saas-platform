import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, deleteOrder, deductCredit, addInventoryLog, getProductById } from "@/lib/repository";

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

// GET - 获取单个订单详情
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Order GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch order" }, { status: 500 });
  }
}

// PUT - 更新订单（包含运费功能：从代理商信用额度扣减运费
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const order = await getOrderById(params.id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 字段映射
    const updates: any = {
      status: body.status,
      trackingNumber: body.trackingNumber,
      company: body.company,
    };

    // 运费处理：只更新运费金额，不重复扣减（前端已经处理了扣减）
    if (body.shippingFee !== undefined && body.shippingFee !== null) {
      updates.shippingFee = parseFloat(body.shippingFee);
    }

    // 如果状态变为已发货，设置发货时间
    if (body.status === "shipped") {
      updates.shippedAt = body.shippedAt || formatMySQLDate();
    }

    // 保留原有的订单信息更新
    if (body.shippingAddress !== undefined) updates.shippingAddress = body.shippingAddress;
    if (body.postalCode !== undefined) updates.postalCode = body.postalCode;
    if (body.country !== undefined) updates.country = body.country;
    if (body.contactName !== undefined) updates.contactName = body.contactName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.trackingImage !== undefined) updates.trackingImage = body.trackingImage;
    if (body.qrCode !== undefined) updates.qrCode = body.qrCode;

    const updated = await updateOrder(params.id, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Order PUT error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// DELETE - 删除订单
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await deleteOrder(params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Order DELETE error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
