import { NextRequest, NextResponse } from "next/server";
import { getCredits, saveCredits } from "@/lib/storage";

// 自动为没有信用记录的代理商创建记录
function syncCreditRecords() {
  const credits = getCredits();
  let changed = false;
  
  try {
    const fs = require("fs");
    const path = require("path");
    const DATA_DIR = path.join(process.cwd(), "data");
    const AGENTS_FILE = path.join(DATA_DIR, "agents.json");
    const agents = JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
    
    for (const agent of agents) {
      if (!credits[agent.id]) {
        credits[agent.id] = {
          agentId: agent.id,
          company: agent.company,
          creditLimit: agent.creditLimit || 10000,
          outstanding: agent.outstanding || 0,
          available: (agent.creditLimit || 10000) - (agent.outstanding || 0),
          transactions: [],
        };
        changed = true;
      }
    }
    
    if (changed) {
      saveCredits(credits);
    }
  } catch {
    // 忽略错误
  }
}

syncCreditRecords();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");

  const credits = getCredits();

  if (agentId) {
    const record = credits[agentId];
    if (!record) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json(record);
  }

  return NextResponse.json(Object.values(credits));
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, action, creditLimit, amount, note } = body;

    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const credits = getCredits();
    if (!credits[agentId]) {
      return NextResponse.json({ error: "Agent credit record not found" }, { status: 404 });
    }

    const record = credits[agentId];

    if (action === "set_limit") {
      record.creditLimit = creditLimit;
      record.available = record.creditLimit - record.outstanding;
      record.transactions.unshift({
        id: `txn_${Date.now()}`,
        type: "admin_set_limit",
        amount: creditLimit - (record.creditLimit - creditLimit + record.creditLimit),
        balance: record.creditLimit,
        note: note || "Credit limit adjusted by admin",
        time: new Date().toISOString(),
      });
    } else if (action === "deduct") {
      if (record.available < amount) {
        return NextResponse.json({ error: "Insufficient credit" }, { status: 400 });
      }
      record.outstanding += amount;
      record.available = record.creditLimit - record.outstanding;
      record.transactions.unshift({
        id: `txn_${Date.now()}`,
        type: "order_deduct",
        amount: -amount,
        balance: record.available,
        note: note || "Order deduction",
        time: new Date().toISOString(),
      });
    } else if (action === "repay") {
      record.outstanding = Math.max(0, record.outstanding - amount);
      record.available = record.creditLimit - record.outstanding;
      record.transactions.unshift({
        id: `txn_${Date.now()}`,
        type: "repayment",
        amount: amount,
        balance: record.available,
        note: note || "Payment received",
        time: new Date().toISOString(),
      });
    } else if (action === "clear_outstanding") {
      const clearedAmount = record.outstanding;
      record.outstanding = 0;
      record.available = record.creditLimit;
      record.transactions.unshift({
        id: `txn_${Date.now()}`,
        type: "admin_writeoff",
        amount: clearedAmount,
        balance: record.available,
        note: note || "Outstanding cleared by admin",
        time: new Date().toISOString(),
      });
    } else if (action === "set_all") {
      for (const item of creditLimit) {
        if (credits[item.agentId]) {
          credits[item.agentId].creditLimit = item.creditLimit;
          credits[item.agentId].available =
            item.creditLimit - credits[item.agentId].outstanding;
        }
      }
      saveCredits(credits);
      return NextResponse.json({ success: true });
    }

    saveCredits(credits);
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
