import { NextRequest, NextResponse } from "next/server";
import { getAllAgents, getAgentById, createAgent, updateAgent, deleteAgent, getAgentByEmail } from "@/lib/repository";
import { requireAuth, requireAdmin, SessionUser } from "@/lib/auth";

// GET - 获取代理商信息
// 代理商只能查看自己的信息；管理员可查看全部
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    // 代理商只能查看自己的信息
    if (user.role === "agent") {
      const agent = await getAgentById(user.id);
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      return NextResponse.json(agent);
    }

    // 管理员：按 ID 获取
    if (agentId) {
      const agent = await getAgentById(agentId);
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      return NextResponse.json(agent);
    }

    // 管理员：返回所有代理商
    const agents = await getAllAgents();
    return NextResponse.json(agents);
  } catch (error: any) {
    console.error("Agents GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch agents" }, { status: 500 });
  }
}

// POST - 创建代理商（仅管理员）
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

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
// 管理员可修改任意代理商；代理商只能修改自己的非敏感字段（contact、phone、country、password）
export async function PUT(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult as SessionUser;

    const body = await req.json();
    const { agentId, ...updates } = body;

    // 代理商只能修改自己的信息
    const targetAgentId = user.role === "agent" ? user.id : agentId;

    if (!targetAgentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const existing = await getAgentById(targetAgentId);
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 代理商不能修改敏感字段（creditLimit、outstanding、level、status）
    let allowedUpdates = updates;
    if (user.role === "agent") {
      allowedUpdates = {};
      // 仅允许修改联系信息和密码
      if (updates.contact !== undefined) allowedUpdates.contact = updates.contact;
      if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;
      if (updates.country !== undefined) allowedUpdates.country = updates.country;
      if (updates.password !== undefined) allowedUpdates.password = updates.password;
    }

    const result = await updateAgent(targetAgentId, allowedUpdates);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Agents PUT error:", error);
    return NextResponse.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

// DELETE - 删除代理商（仅管理员）
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

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
