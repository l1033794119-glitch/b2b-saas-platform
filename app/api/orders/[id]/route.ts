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

    // 运费处理：如果提供 shippingFee 且订单状态变为已发货（shipped），则从代理商信用额度中扣减运费
    if (body.shippingFee !== undefined && body.shippingFee !== null) {
      updates.shippingFee = parseFloat(body.shippingFee);

      // 如果之前没有运费记录，且现在发货则扣减运费
      if (!order.shippingFee && parseFloat(body.shippingFee) > 0) {
        try {
          await deductCredit(order.agentId, parseFloat(body.shippingFee), `Shipping fee for order ${order.orderNo}`);
          updates.shippedAt = body.shippedAt || formatMySQLDate();
        } catch (err: any) {
            console.error("Failed to deduct shipping fee:", err);
          }
      } else {
        updates.shippedAt = body.shippedAt || formatMySQLDate();
      }
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
