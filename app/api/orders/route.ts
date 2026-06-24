import { NextRequest, NextResponse } from "next/server";
import { getAllOrders, getOrdersByAgentId, createOrder, getProductById, updateProductStock } from "@/lib/repository";

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

// GET - 获取所有订单或按代理商筛选
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (agentId) {
      const orders = await getOrdersByAgentId(agentId);
      return NextResponse.json(orders);
    }

    const orders = await getAllOrders();
    return NextResponse.json(orders);
  } catch (error: any) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 });
  }
}

// POST - 创建订单（包含库存扣减）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, items, total, shippingAddress, postalCode, country, contactName, phone, email, note } = body;

    if (!agentId || !items || items.length === 0) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // 检查库存是否足够
    const stockErrors: string[] = [];
    for (const item of items) {
      const product = await getProductById(item.productId);
      if (!product) {
        stockErrors.push(`Product not found: ${item.name}`);
      } else if ((product.stock || 0) < (item.quantity || 0)) {
        stockErrors.push(`Insufficient stock for ${item.name} (available: ${product.stock})`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: stockErrors.join("; ") }, { status: 400 });
    }

    // 扣减库存
    for (const item of items) {
      const product = await getProductById(item.productId);
      if (product) {
        const newStock = (product.stock || 0) - (item.quantity || 0);
        await updateProductStock(item.productId, newStock);
      }
    }

    // 从代理商信用额度扣减
    try {
      const creditResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/credit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          action: "deduct",
          amount: total,
          note: `Order ${body.orderNo || `ORD-${Date.now()}`}`,
        }),
      });

      if (!creditResponse.ok) {
        // 信用扣减失败，回滚库存
        for (const item of items) {
          const product = await getProductById(item.productId);
          if (product) {
            await updateProductStock(item.productId, (product.stock || 0) + (item.quantity || 0));
          }
        }
        const err = await creditResponse.json();
        return NextResponse.json({ error: err.error || "Insufficient credit" }, { status: 400 });
      }
    } catch (creditError) {
      console.error("Credit deduction failed:", creditError);
    }

    const order = {
      id: `ord_${Date.now()}`,
      orderNo: body.orderNo || `ORD-${Date.now()}`,
      agentId,
      items: items || [],
      total: total || 0,
      status: "pending_review",
      date: formatMySQLDate(),
      shippingAddress: shippingAddress || "",
      postalCode: postalCode || "",
      country: country || "",
      contactName: contactName || "",
      phone: phone || "",
      email: email || "",
      notes: note || "",
      trackingNumber: null,
      company: null,
      shippingFee: null,
      shippedAt: null,
    };

    const result = await createOrder(order);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
