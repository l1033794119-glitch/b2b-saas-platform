import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  getAllOrders, getOrdersByAgentId, createOrder, getProductById,
  updateProductStock, getAgentById, deductCredit, queryOrders,
} from "@/lib/repository";
import { requireAuth, requireAdmin, checkOwnership, SessionUser } from "@/lib/auth";
import { verifyCsrfToken, issueCsrfToken, checkRateLimit } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// GET - 获取订单（支持分页 + 搜索 + 多维度筛选 / 兼容老调用：不传 pageSize 仍返回数组）
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const { searchParams } = new URL(req.url);

    // ---- 分页/筛选参数（统一接收，admin/agent/shipping 都走 queryOrders） ----
    const requestedAgentId = searchParams.get("agentId") || undefined;
    const status = searchParams.get("status") || undefined;
    // statusIn: 物流页用，逗号分隔（例：pending_delivery,pending_tracking,shipped,completed）
    const statusIn = searchParams.get("statusIn")
      ? searchParams.get("statusIn")!.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const from = searchParams.get("from") || searchParams.get("dateFrom") || undefined;
    const to = searchParams.get("to") || searchParams.get("dateTo") || undefined;
    const q = searchParams.get("q") || searchParams.get("search") || undefined;
    const pageRaw = searchParams.get("page");
    const pageSizeRaw = searchParams.get("pageSize");

    const page = pageRaw ? parseInt(pageRaw, 10) : NaN;
    const pageSize = pageSizeRaw ? parseInt(pageSizeRaw, 10) : NaN;
    const wantPaginated = Number.isFinite(pageSize) && pageSize > 0;

    // 代理商：只能看自己的订单，完全忽略传入的 agentId
    const agentScope = user.role === "agent" ? user.id : requestedAgentId;

    // ---- 兼容模式：未传 pageSize（仍然一次性返回全量数组，给 dashboard/detail 老调用） ----
    if (!wantPaginated) {
      if (agentScope) {
        const orders = await getOrdersByAgentId(agentScope);
        return NextResponse.json(orders);
      }
      const orders = await getAllOrders();
      return NextResponse.json(orders);
    }

    // ---- 分页模式：返回 { data, total, page, pageSize, totalPages, hasPrev, hasNext } ----
    const result = await queryOrders({
      agentId: agentScope,
      status: status && status !== "all" ? status : undefined,
      statusIn,
      warehouseId: warehouseId && warehouseId !== "all" ? warehouseId : undefined,
      from, to, q,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch orders" }, { status: 500 });
  }
}

// POST - 创建订单（包含库存扣减 + CSRF 校验 + 速率限制）
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    // ===== 速率限制：同一代理商 60 秒内最多 3 个订单 =====
    // 目的：防止外部平台（SHOPYY/Shoplazza）的脚本批量同步订单
    const rateKey = `order_create:${user.role === "agent" ? user.id : "admin"}`;
    const rate = await checkRateLimit(rateKey, 60 * 1000, 3);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Too many orders. Please wait ${rate.resetInSec} seconds before placing another order`,
        },
        { status: 429 }
      );
    }

    // ===== CSRF Token 校验：必须携带登录时颁发的 token =====
    // 目的：防止外部脚本直接调用 API 下单，必须先通过浏览器登录获取 token
    const sessionId = req.cookies.get("b2b_sid")?.value || "";
    const body = await req.json();
    const submittedCsrf = body._csrf || body.csrfToken || null;
    const csrfOk = await verifyCsrfToken(sessionId, submittedCsrf);
    if (!csrfOk) {
      // token 已失效，重新颁发一个新 token 让前端可以继续操作
      const freshToken = await issueCsrfToken(sessionId);
      return NextResponse.json(
        {
          error: "Invalid or expired CSRF token. Please try again.",
          csrfToken: freshToken,
        },
        { status: 403 }
      );
    }

    // 辅助函数：CSRF token 已被一次性消耗，后续任何步骤失败时必须重新颁发
    const failWithNewCsrf = (error: string, status: number, extra?: Record<string, any>) =>
      issueCsrfToken(sessionId).then(newToken =>
        NextResponse.json({ error, csrfToken: newToken, ...extra }, { status })
      );

    // ===== hCaptcha 人机验证：必须通过验证码才能下单 =====
    // 目的：彻底禁止自动化脚本（SHOPYY/Shoplazza 同步）下单
    // 被管理员标记为"免人机验证"的代理商跳过此步骤
    if (!user.skipCaptcha) {
      const captchaToken = body.captchaToken || body["h-captcha-response"] || null;
      const remoteIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null;
      const captchaOk = await verifyCaptcha(captchaToken, remoteIp);
      if (!captchaOk) {
        return await failWithNewCsrf("Captcha verification failed. Please complete the captcha and try again", 403);
      }
    }

    const { agentId: bodyAgentId, items, total, shippingAddress, postalCode, country, contactName, phone, email, note } = body;

    // 代理商只能为自己创建订单；管理员可指定任意 agentId
    const agentId = user.role === "agent" ? user.id : bodyAgentId;

    if (!agentId || !items || items.length === 0) {
      return await failWithNewCsrf("Invalid order data", 400);
    }

    // 检查库存是否足够，同时获取代理商等级
    const agent = await getAgentById(agentId);
    const agentLevel = agent?.level || "B";
    const priceKey = agentLevel === "A" ? "levelAPrice" : agentLevel === "C" ? "levelCPrice" : "levelBPrice";

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
      return await failWithNewCsrf(stockErrors.join("; "), 400);
    }

    // 扣减库存并获取仓库信息，同时使用数据库最新价格覆盖前端传来的价格
    const warehouseIds = new Set<string>();
    const warehouseNames = new Set<string>();
    const orderItemsWithWarehouse = [];
    let serverTotal = 0;

    for (const item of items) {
      const product = await getProductById(item.productId);
      if (product) {
        const newStock = (product.stock || 0) - (item.quantity || 0);
        await updateProductStock(item.productId, newStock);

        if (product.warehouseId) warehouseIds.add(product.warehouseId);
        if (product.warehouse) warehouseNames.add(product.warehouse);

        const productImages = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
        // 使用数据库中的最新价格，而非前端传来的价格
        const serverPrice = (product as any)[priceKey] || 0;
        serverTotal += serverPrice * (item.quantity || 0);

        orderItemsWithWarehouse.push({
          ...item,
          price: serverPrice,
          warehouseId: product.warehouseId || null,
          warehouse: product.warehouse || null,
          image: item.image || (productImages.length > 0 ? productImages[0] : "") || "",
        });
      } else {
        orderItemsWithWarehouse.push(item);
      }
    }

    // 从代理商信用额度扣减（直接调用函数，避免内部 HTTP 请求被鉴权拦截）
    try {
      await deductCredit(agentId, serverTotal || total, `Order ${body.orderNo || `ORD-${Date.now()}`}`);
    } catch (creditError: any) {
      // 信用扣减失败，回滚库存
      for (const item of items) {
        const product = await getProductById(item.productId);
        if (product) {
          await updateProductStock(item.productId, (product.stock || 0) + (item.quantity || 0));
        }
      }
      return await failWithNewCsrf(creditError?.message || "Insufficient credit", 400);
    }

    const order = {
      id: `ord_${Date.now()}`,
      orderNo: body.orderNo || `ORD-${Date.now()}`,
      agentId,
      items: orderItemsWithWarehouse || [],
      total: serverTotal || total || 0,
      status: "pending_qrcode",
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
      qrCode: null,
      warehouseId: warehouseIds.size === 1 ? Array.from(warehouseIds)[0] : null,
      warehouse: warehouseNames.size === 1 ? Array.from(warehouseNames)[0] : null,
    };

    const result = await createOrder(order);

    // 下单成功后重新颁发 CSRF token（一次性 token 已被消耗）
    const newCsrfToken = await issueCsrfToken(sessionId);

    // 失效订单、产品库存、仪表盘缓存
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
      revalidatePath("/agent/catalog");
    } catch (err) {
      console.warn("Orders POST revalidate failed:", err);
    }

    return NextResponse.json(
      { ...result, csrfToken: newCsrfToken },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Orders POST error:", error);
    // 异常时也重新颁发 CSRF token，防止 token 被消耗后无法继续下单
    const sid = req.cookies.get("b2b_sid")?.value || "";
    const freshToken = await issueCsrfToken(sid).catch(() => null);
    return NextResponse.json({ error: error.message || "Invalid request", csrfToken: freshToken }, { status: 400 });
  }
}
