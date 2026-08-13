import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getOrderById, updateOrder, deleteOrder, deductCredit, addInventoryLog, getProductById } from "@/lib/repository";
import { requireAuth, checkOwnership, isAdminRole, SessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// GET - 获取单个订单详情（代理商只能访问自己的订单）
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 校验归属：代理商只能查看自己的订单
    if (!checkOwnership(user, order.agentId)) {
      return NextResponse.json({ error: "Forbidden - Not your order" }, { status: 403 });
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
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const body = await req.json();
    const order = await getOrderById(params.id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 校验归属：代理商只能修改自己的订单
    // 注意：状态流转等敏感操作仍需管理员权限（见下方）
    if (!checkOwnership(user, order.agentId)) {
      return NextResponse.json({ error: "Forbidden - Not your order" }, { status: 403 });
    }

    // 敏感字段（status、trackingNumber、company、shippingFee、qrCode、waybillImage）
    // 只允许管理员修改；代理商只能修改自己的 contactName、phone、email、shippingAddress 等收货信息
    const updates: any = {};

    if (isAdminRole(user.role as string)) {
      // 管理员可修改所有字段
      if (body.status !== undefined) updates.status = body.status;
      if (body.trackingNumber !== undefined) updates.trackingNumber = body.trackingNumber;
      if (body.company !== undefined) updates.company = body.company;
      if (body.shippingFee !== undefined && body.shippingFee !== null) {
        updates.shippingFee = parseFloat(body.shippingFee);
      }
      if (body.shippingAddress !== undefined) updates.shippingAddress = body.shippingAddress;
      if (body.postalCode !== undefined) updates.postalCode = body.postalCode;
      if (body.country !== undefined) updates.country = body.country;
      if (body.contactName !== undefined) updates.contactName = body.contactName;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.email !== undefined) updates.email = body.email;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.trackingImage !== undefined) updates.trackingImage = body.trackingImage;
      if (body.qrCode !== undefined) updates.qrCode = body.qrCode;
      if (body.waybillImage !== undefined) updates.waybillImage = body.waybillImage;

      // 如果状态变为已发货，设置发货时间
      if (body.status === "shipped") {
        updates.shippedAt = formatMySQLDate(body.shippedAt ? new Date(body.shippedAt) : new Date());
      }
    } else {
      // 代理商只能修改收货信息
      if (body.shippingAddress !== undefined) updates.shippingAddress = body.shippingAddress;
      if (body.postalCode !== undefined) updates.postalCode = body.postalCode;
      if (body.country !== undefined) updates.country = body.country;
      if (body.contactName !== undefined) updates.contactName = body.contactName;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.email !== undefined) updates.email = body.email;
      // 代理商可以将自己的订单标记为已完成（已发货后）
      if (body.status === "completed" && order.status === "shipped") {
        updates.status = "completed";
      }
    }

    const updated = await updateOrder(params.id, updates);

    // 订单修改后失效缓存
    try {
      revalidateTag("orders");
      revalidateTag("products");
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/orders");
      revalidatePath("/agent", "layout");
      revalidatePath("/agent/dashboard");
      revalidatePath("/agent/orders");
    } catch (err) {
      console.warn("Order PUT revalidate failed:", err);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Order PUT error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// DELETE - 删除订单（仅管理员）
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    if (!isAdminRole(user.role as string)) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const result = await deleteOrder(params.id);

    try {
      revalidateTag("orders");
      revalidateTag("products");
      revalidatePath("/", "layout");
      revalidatePath("/admin", "layout");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/orders");
      revalidatePath("/agent", "layout");
      revalidatePath("/agent/dashboard");
      revalidatePath("/agent/orders");
    } catch (err) {
      console.warn("Order DELETE revalidate failed:", err);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Order DELETE error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
