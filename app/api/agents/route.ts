import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, getAgentById, createAgent, updateAgent, deleteAgent, getAgentByEmail } from "@/lib/repository";

// GET - 获取所有代理商或按条件筛选
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const email = searchParams.get("email");
    const password = searchParams.get("password");

    // 登录验证：邮箱 + 密码
    if (email && password) {
      const agent = await getAgentByEmail(email, password);
      if (!agent) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      return NextResponse.json(agent);
    }

    // 按 ID 获取
    if (agentId) {
      const agent = await getAgentById(agentId);
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      return NextResponse.json(agent);
    }

    // 返回所有代理商（不含密码）
    const agents = await getAllAgents();
    return NextResponse.json(agents);
  } catch (error: any) {
    console.error("Agents GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch agents" }, { status: 500 });
  }
}

// POST - 创建代理商
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 检查邮箱是否已存在
    const agents = await getAllAgents();
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
      availableCredit: (body.creditLimit || 10000) - (body.outstanding || 0),
      joinDate: new Date().toISOString().split("T")[0],
    };

    const result = await createAgent(newAgent);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Agents POST error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// PUT - 更新代理商信息
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, ...updates } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const existing = await getAgentById(agentId);
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const result = await updateAgent(agentId, updates);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agents PUT error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// DELETE - 删除代理商
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const existing = await getAgentById(agentId);
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await deleteAgent(agentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Agents DELETE error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}
