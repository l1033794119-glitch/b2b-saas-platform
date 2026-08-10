import { NextRequest, NextResponse } from "next/server";
import {
  getOrderById,
  updateOrder,
  getAgentById,
  getProductById,
  updateProductStock,
  addInventoryLog,
  repayCredit,
} from "@/lib/repository";
import { requireAuth, requireAdmin, checkOwnership, SessionUser } from "@/lib/auth";

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

const cancellableStatuses = [
  "pending_qrcode",
  "pending_delivery",
  "pending_tracking",
];

// POST - 代理商发起取消订单申请
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const body = await req.json();
    const { cancelReason } = body;

    if (!cancelReason || !cancelReason.trim()) {
      return NextResponse.json(
        { error: "取消原因不能为空" },
        { status: 400 }
      );
    }

    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      );
    }

    // 校验归属：代理商只能取消自己的订单
    if (!checkOwnership(user, order.agentId)) {
      return NextResponse.json(
        { error: "无权操作他人订单" },
        { status: 403 }
      );
    }

    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: "当前订单状态不可取消" },
        { status: 400 }
      );
    }

    if (order.status === "pending_cancellation") {
      return NextResponse.json(
        { error: "订单已在取消审核中" },
        { status: 400 }
      );
    }

    const updates: any = {
      status: "pending_cancellation",
      previousStatus: order.status,
      cancelReason: cancelReason.trim(),
      cancelRequestedAt: formatMySQLDate(),
    };

    const updated = await updateOrder(params.id, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Order cancel request error:", error);
    return NextResponse.json(
      { error: error.message || "请求失败" },
      { status: 500 }
    );
  }
}

// PUT - 管理员审核取消订单（批准或拒绝）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { action, adminName } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "无效的操作" },
        { status: 400 }
      );
    }

    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      );
    }

    if (order.status !== "pending_cancellation") {
      return NextResponse.json(
        { error: "订单不在取消审核状态" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const updates: any = {
        status: order.previousStatus || "pending_qrcode",
        cancelReason: order.cancelReason,
        cancelledBy: adminName || "admin",
      };

      const updated = await updateOrder(params.id, updates);
      return NextResponse.json(updated);
    }

    if (action === "approve") {
      const updates: any = {
        status: "cancelled",
        cancelledAt: formatMySQLDate(),
        cancelledBy: adminName || "admin",
      };

      const updated = await updateOrder(params.id, updates);

      try {
        // 退款金额 = 商品总价 + 运费（运费在保存二维码时已扣减到信用额度）
        const refundAmount = (Number(order.total) || 0) + (Number(order.shippingFee) || 0);
        if (refundAmount > 0) {
          await repayCredit(
            order.agentId,
            refundAmount,
            `取消订单退款 ${order.orderNo}（含运费 ${Number(order.shippingFee) || 0}）`
          );
        }
      } catch (creditError) {
        console.error("Credit refund error:", creditError);
      }

      try {
        const items = order.items || [];
        for (const item of items) {
          const product = await getProductById(item.productId);
          if (product) {
            const newStock = (product.stock || 0) + (item.quantity || 0);
            await updateProductStock(item.productId, newStock);
            await addInventoryLog({
              productId: item.productId,
              type: "restock",
              quantity: item.quantity,
              beforeStock: product.stock || 0,
              afterStock: newStock,
              note: `订单取消恢复库存 ${order.orderNo}`,
              operator: adminName || "admin",
            });
          }
        }
      } catch (stockError) {
        console.error("Stock restore error:", stockError);
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error: any) {
    console.error("Order cancel review error:", error);
    return NextResponse.json(
      { error: error.message || "操作失败" },
      { status: 500 }
    );
  }
}
