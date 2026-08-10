import { NextRequest, NextResponse } from "next/server";
import { getAllCredits, getCreditByAgentId, deductCredit, repayCredit, setCreditLimit } from "@/lib/repository";
import { requireAuth, requireAdmin, SessionUser } from "@/lib/auth";

// GET - 获取信用额度记录
// 代理商只能查看自己的信用额度；管理员可查看全部
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const { searchParams } = new URL(req.url);
    const requestedAgentId = searchParams.get("agentId");

    // 代理商只能查看自己的信用额度
    if (user.role === "agent") {
      const record = await getCreditByAgentId(user.id);
      if (!record) {
        return NextResponse.json({ error: "Agent credit record not found" }, { status: 404 });
      }
      return NextResponse.json(record);
    }

    // 管理员
    if (requestedAgentId) {
      const record = await getCreditByAgentId(requestedAgentId);
      if (!record) {
        return NextResponse.json({ error: "Agent credit record not found" }, { status: 404 });
      }
      return NextResponse.json(record);
    }

    const credits = await getAllCredits();
    return NextResponse.json(credits);
  } catch (error: any) {
    console.error("Credit GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch credits" }, { status: 500 });
  }
}

// PUT - 信用额度操作（仅管理员，扣减/还款/设置额度/清零）
export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { agentId, action, creditLimit, amount, note } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    let result;
    switch (action) {
      case "deduct":
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
        }
        result = await deductCredit(agentId, amount, note || "Credit deduction");
        break;

      case "repay":
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
        }
        result = await repayCredit(agentId, amount, note || "Credit repayment");
        break;

      case "set_limit":
        if (creditLimit === undefined || creditLimit === null) {
          return NextResponse.json({ error: "Credit limit required" }, { status: 400 });
        }
        result = await setCreditLimit(agentId, creditLimit, note || "Credit limit adjusted");
        break;

      case "clear_outstanding":
        const creditInfo = await getCreditByAgentId(agentId);
        if (!creditInfo) {
          return NextResponse.json({ error: "Agent credit record not found" }, { status: 404 });
        }
        const outstandingAmount = parseFloat(creditInfo.outstanding as any) || 0;
        if (outstandingAmount <= 0) {
          result = creditInfo;
        } else {
          result = await repayCredit(agentId, outstandingAmount, note || "Outstanding cleared");
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Credit PUT error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
