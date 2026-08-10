import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export interface SessionUser {
  id: string;
  role: "admin" | "agent";
  email?: string;
  name?: string;
  level?: string;
  company?: string;
}

// 从请求中解析当前会话用户
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  try {
    const sessionId = req.cookies.get("session_id")?.value;
    if (!sessionId) return null;

    const sessions: any[] = await query(
      "SELECT * FROM sessions WHERE session_id = ? AND expires_at > NOW()",
      [sessionId]
    );
    if (sessions.length === 0) return null;

    const session = sessions[0];
    const userId = session.user_id;
    const userType = session.user_type as "admin" | "agent";

    if (userType === "admin") {
      const employees: any[] = await query("SELECT * FROM employees WHERE id = ?", [userId]);
      if (employees.length === 0) return null;
      const emp = employees[0];
      if (!emp.active) return null;
      return {
        id: emp.id,
        role: "admin",
        email: emp.email,
        name: emp.name,
      };
    } else {
      const agents: any[] = await query("SELECT * FROM agents WHERE id = ?", [userId]);
      if (agents.length === 0) return null;
      const agent = agents[0];
      if (agent.status !== "active") return null;
      return {
        id: agent.id,
        role: "agent",
        email: agent.email,
        name: agent.contact || agent.company,
        level: agent.level,
        company: agent.company,
      };
    }
  } catch (error) {
    console.error("getSessionUser error:", error);
    return null;
  }
}

// 401 未登录响应
export function unauthorized(message = "Unauthorized - Please login") {
  return NextResponse.json({ error: message }, { status: 401 });
}

// 403 无权限响应
export function forbidden(message = "Forbidden - Insufficient permissions") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// 要求登录（任意角色）
export async function requireAuth(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  return user;
}

// 要求管理员
export async function requireAdmin(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  // 前端登录返回的角色可能是带前缀的 super_admin/warehouse_manager 等，这里都视为 admin 角色类型
  if (user.role !== "admin" &&
      user.role !== "super_admin" &&
      user.role !== "warehouse_manager" &&
      user.role !== "finance_manager" &&
      user.role !== "operations_manager" &&
      user.role !== "customer_service") {
    return forbidden("Admin access required");
  }
  return user;
}

// 要求代理商（或管理员代理操作），返回当前用户
export async function requireAgent(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  return user;
}

// 校验代理商只能访问自己的资源；管理员可访问任意
export function checkOwnership(
  user: SessionUser,
  resourceAgentId: string | undefined | null
): boolean {
  if (user.role === "admin") return true;
  if (!resourceAgentId) return false;
  return user.id === resourceAgentId;
}
