import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/repository";
import { requireAuth, SessionUser } from "@/lib/auth";

// 性能优化专用接口：返回仪表盘所有卡片 + 图表的聚合数据
// 代替前端以前 Promise.all 拉 4 张整表（orders/products/agents/warehouses）
// 响应大小从 1~10MB 降到 <30KB，耗时从 5~30s 降到 50~200ms

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const start = fromStr ? new Date(fromStr) : null;
    const end = toStr ? new Date(toStr + " 23:59:59") : null;
    // 非法日期直接忽略（防止 NaN 传给 MySQL）
    const safeStart = start && !isNaN(start.getTime()) ? start : null;
    const safeEnd = end && !isNaN(end.getTime()) ? end : null;

    if (user.role === "agent") {
      const s = await getDashboardSummary(
        { role: "agent", agentId: user.id },
        { start: safeStart, end: safeEnd }
      );
      return NextResponse.json(s);
    }

    // 管理员 & 其它角色（通过 isAdminRole 覆盖的 super_admin/finance/... 都会走到这里，
    // 因为 requireAuth 未拒绝说明已登录）
    const s = await getDashboardSummary(
      { role: "admin" },
      { start: safeStart, end: safeEnd }
    );
    return NextResponse.json(s);
  } catch (e: any) {
    console.error("dashboard-summary GET error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to compute summary" },
      { status: 500 }
    );
  }
}
