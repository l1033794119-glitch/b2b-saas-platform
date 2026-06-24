import { NextRequest, NextResponse } from "next/server";
import { getAllCredits, getCreditByAgentId, deductCredit, repayCredit, setCreditLimit } from "@/lib/repository";

// GET - 获取所有信用额度记录或按代理商筛选
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (agentId) {
      const record = await getCreditByAgentId(agentId);
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

// PUT - 信用额度操作（扣减/还款/设置额度/清零）
export async function PUT(req: NextRequest) {
  try {
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
