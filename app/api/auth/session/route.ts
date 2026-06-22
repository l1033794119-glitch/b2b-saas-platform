import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, admin } = await req.json();
    
    if (admin) {
      const employees: any[] = await query("SELECT * FROM employees WHERE email = ?", [email]);
      const employee = employees[0];
      
      if (!employee) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      
      if (password && employee.password !== password) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      
      if (!employee.active) {
        return NextResponse.json({ success: false, error: "Account is inactive" }, { status: 401 });
      }
      
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      try {
        await execute(
          "INSERT INTO sessions (session_id, user_id, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
          [sessionId, employee.id, "admin", formatMySQLDate(expiresAt), formatMySQLDate()]
        );
      } catch (dbError) {
        console.log("Session table may not exist, using memory session");
      }
      
      const permissions = typeof employee.permissions === 'string' 
        ? JSON.parse(employee.permissions) 
        : (employee.permissions || {});
      
      const response = NextResponse.json({
        success: true,
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: "super_admin",
          permissions: permissions,
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
      const agents: any[] = await query("SELECT * FROM agents WHERE email = ?", [email]);
      const agent = agents[0];
      
      if (!agent) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      
      if (password && agent.password !== password) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }
      
      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      try {
        await execute(
          "INSERT INTO sessions (session_id, user_id, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
          [sessionId, agent.id, "agent", formatMySQLDate(expiresAt), formatMySQLDate()]
        );
      } catch (dbError) {
        console.log("Session table may not exist, using memory session");
      }
      
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
    
    let sessionUser = null;
    let sessionType = null;
    
    try {
      const sessions: any[] = await query(
        "SELECT * FROM sessions WHERE session_id = ? AND expires_at > NOW()",
        [sessionId]
      );
      
      if (sessions.length > 0) {
        sessionUser = sessions[0].user_id;
        sessionType = sessions[0].user_type;
      }
    } catch (dbError) {
      console.log("Session table query failed, trying memory session");
    }
    
    if (!sessionUser) {
      return NextResponse.json({ authenticated: false });
    }
    
    if (sessionType === "admin") {
      const employees: any[] = await query("SELECT * FROM employees WHERE id = ?", [sessionUser]);
      const employee = employees[0];
      
      if (!employee) {
        return NextResponse.json({ authenticated: false });
      }
      
      const permissions = typeof employee.permissions === 'string' 
        ? JSON.parse(employee.permissions) 
        : (employee.permissions || {});
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: "super_admin",
          permissions: permissions,
        },
      });
    } else {
      const agents: any[] = await query("SELECT * FROM agents WHERE id = ?", [sessionUser]);
      const agent = agents[0];
      
      if (!agent) {
        return NextResponse.json({ authenticated: false });
      }
      
      return NextResponse.json({
        authenticated: true,
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
      try {
        await execute("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
      } catch (dbError) {
        console.log("Session table delete failed");
      }
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