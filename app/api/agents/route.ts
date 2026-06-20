import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");
const CREDIT_FILE = path.join(DATA_DIR, "credit.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const WAREHOUSES_FILE = path.join(DATA_DIR, "warehouses.json");

// 确保数据目录存在
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ============ Agents API ============

function readAgents() {
  try {
    return JSON.parse(fs.readFileSync(AGENTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeAgents(agents: any[]) {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function readCredits() {
  try {
    return JSON.parse(fs.readFileSync(CREDIT_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeCredits(credits: Record<string, any>) {
  fs.writeFileSync(CREDIT_FILE, JSON.stringify(credits, null, 2));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const email = searchParams.get("email");
  const password = searchParams.get("password");

  if (email && password) {
    const agent = readAgents().find((a: any) => a.email === email);
    if (!agent || agent.password !== password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const { password: _, ...safeAgent } = agent;
    return NextResponse.json(safeAgent);
  }

  if (agentId) {
    const agent = readAgents().find((a: any) => a.id === agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const { password: _, ...safeAgent } = agent;
    return NextResponse.json(safeAgent);
  }

  const agents = readAgents();
  const safeAgents = agents.map(({ password: _, ...agent }: any) => agent);
  return NextResponse.json(safeAgents);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agents = readAgents();

    if (body.email && agents.find((a: any) => a.email === body.email)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const id = body.id || `a${Date.now()}`;
    const newAgent = {
      id,
      company: body.company || "",
      contact: body.contact || body.company || "",
      email: body.email || "",
      password: body.password || "agent123",
      phone: body.phone || "",
      country: body.country || "",
      level: body.level || "B",
      status: body.status || "active",
      creditLimit: body.creditLimit || 10000,
      outstanding: body.outstanding || 0,
      joinDate: new Date().toISOString().split("T")[0],
    };

    agents.push(newAgent);
    writeAgents(agents);

    // 同时创建信用记录
    const credits = readCredits();
    credits[id] = {
      agentId: id,
      company: newAgent.company,
      creditLimit: newAgent.creditLimit,
      outstanding: newAgent.outstanding,
      available: newAgent.creditLimit - newAgent.outstanding,
      transactions: [],
    };
    writeCredits(credits);

    const { password: _, ...safeAgent } = newAgent;
    return NextResponse.json(safeAgent, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, ...updates } = body;

    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const agents = readAgents();
    const idx = agents.findIndex((a: any) => a.id === agentId);
    if (idx === -1) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    agents[idx] = { ...agents[idx], ...updates };
    writeAgents(agents);

    if (updates.creditLimit !== undefined) {
      const credits = readCredits();
      if (credits[agentId]) {
        credits[agentId] = {
          ...credits[agentId],
          creditLimit: updates.creditLimit,
          available: updates.creditLimit - (credits[agentId].outstanding || 0),
        };
        writeCredits(credits);
      }
    }

    const { password: _, ...safeAgent } = agents[idx];
    return NextResponse.json(safeAgent);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const agents = readAgents();
  const filtered = agents.filter((a: any) => a.id !== agentId);
  if (filtered.length === agents.length) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  writeAgents(filtered);

  // 同步删除该代理商的信用记录
  const credits = readCredits();
  if (credits[agentId]) {
    delete credits[agentId];
    writeCredits(credits);
  }

  return NextResponse.json({ success: true });
}
