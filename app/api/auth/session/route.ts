import { NextRequest, NextResponse } from "next/server";
import { getEmployeeByEmail, getAgentByEmail } from "@/lib/repository";

const SESSIONS = new Map<string, { userId: string; userType: string; expiresAt: number }>();

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, admin } = await req.json();
    
    if (admin) {
      const employee = await getEmployeeByEmail(email, password);
      if (!employee) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      
      const sessionId = generateSessionId();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      
      SESSIONS.set(sessionId, {
        userId: employee.id,
        userType: "admin",
        expiresAt,
      });
      
      const response = NextResponse.json({
        success: true,
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: "super_admin",
          permissions: employee.permissions,
        },
      });
      
      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
      
      return response;
    } else {
      const agent = await getAgentByEmail(email, password);
      if (!agent) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      
      const sessionId = generateSessionId();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      
      SESSIONS.set(sessionId, {
        userId: agent.id,
        userType: "agent",
        expiresAt,
      });
      
      const response = NextResponse.json({
        success: true,
        user: {
          id: agent.id,
          name: agent.contact || agent.company,
          email: agent.email,
          role: "agent",
          company: agent.company,
          country: agent.country,
          level: agent.level,
        },
      });
      
      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
      
      return response;
    }
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value;
    if (!sessionId) {
      return NextResponse.json({ authenticated: false });
    }
    
    const session = SESSIONS.get(sessionId);
    if (!session || session.expiresAt < Date.now()) {
      SESSIONS.delete(sessionId);
      return NextResponse.json({ authenticated: false });
    }
    
    if (session.userType === "admin") {
      const employee = await getEmployeeByEmail("", "");
      const allEmployees = await import("@/lib/repository").then((r) => r.getAllEmployees());
      const foundEmployee = allEmployees.find((e: any) => e.id === session.userId);
      
      if (!foundEmployee) {
        SESSIONS.delete(sessionId);
        return NextResponse.json({ authenticated: false });
      }
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: foundEmployee.id,
          name: foundEmployee.name,
          email: foundEmployee.email,
          role: "super_admin",
          permissions: foundEmployee.permissions,
        },
      });
    } else {
      const allAgents = await import("@/lib/repository").then((r) => r.getAllAgents());
      const foundAgent = allAgents.find((a: any) => a.id === session.userId);
      
      if (!foundAgent) {
        SESSIONS.delete(sessionId);
        return NextResponse.json({ authenticated: false });
      }
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: foundAgent.id,
          name: foundAgent.contact || foundAgent.company,
          email: foundAgent.email,
          role: "agent",
          company: foundAgent.company,
          country: foundAgent.country,
          level: foundAgent.level,
        },
      });
    }
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("session_id")?.value;
    if (sessionId) {
      SESSIONS.delete(sessionId);
    }
    
    const response = NextResponse.json({ success: true });
    response.cookies.set("session_id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}