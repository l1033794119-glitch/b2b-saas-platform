import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { hashPassword, verifyPassword, isPlaintextPassword } from "@/lib/security";
import {
  isLoginLocked,
  recordLoginFailure,
  resetLoginFailure,
  issueCsrfToken,
} from "@/lib/rate-limit";

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatMySQLDate(date: Date = new Date()): string {
  const d = new Date(date);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

// 会话有效期：管理员 8 小时，代理商 24 小时
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;
const AGENT_SESSION_MS = 24 * 60 * 60 * 1000;

/**
 * 生成标准 HTTP Set-Cookie 头字符串
 * （不依赖 NextResponse.cookies.set，避免 middleware 管道改写为 x-middleware-set-cookie）
 */
function buildSetCookie(params: {
  name: string;
  value: string;
  maxAgeSec: number;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}): string {
  const parts: string[] = [`${params.name}=${params.value}`];
  if (params.path) parts.push(`Path=${params.path}`);
  // Max-Age > 0 设置有效期；Max-Age = 0 立即过期（用于登出删除 cookie）
  parts.push(`Max-Age=${params.maxAgeSec}`);
  // Expires 头作为对不支持 Max-Age 的老浏览器兜底
  if (params.maxAgeSec > 0) {
    const expires = new Date(Date.now() + params.maxAgeSec * 1000).toUTCString();
    parts.push(`Expires=${expires}`);
  } else {
    parts.push(`Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  }
  if (params.httpOnly) parts.push("HttpOnly");
  if (params.secure) parts.push("Secure");
  const sameSiteVal = (params.sameSite || "lax").charAt(0).toUpperCase() + (params.sameSite || "lax").slice(1);
  parts.push(`SameSite=${sameSiteVal}`);
  return parts.join("; ");
}

/**
 * 创建 JSON 响应，同时通过标准 Set-Cookie 头写入 session cookie
 * —— 用原生 Headers 绕过 Next.js middleware 管道把 cookie 改成 x-middleware-set-cookie 的 bug
 */
function jsonWithCookie<T>(body: T, cookieStr: string): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieStr,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, admin } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const forwardedProto = req.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";

    // 先检查账号是否被锁定
    const lockKey = admin ? `admin:${email}` : `agent:${email}`;
    const lockCheck = await isLoginLocked(lockKey);
    if (lockCheck.locked) {
      const waitMin = Math.ceil(((lockCheck.lockedUntil!.getTime() - Date.now()) / 60000));
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Account locked, please try again in ${waitMin} minutes`,
        },
        { status: 429 }
      );
    }

    if (admin) {
      const employees: any[] = await query(
        "SELECT * FROM employees WHERE email = ?",
        [email]
      );
      const employee = employees[0];

      if (!employee) {
        await recordLoginFailure(lockKey);
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const { ok, needsMigration } = await verifyPassword(password, employee.password);
      if (!ok) {
        const r = await recordLoginFailure(lockKey);
        const msg = r.remaining > 0
          ? `Invalid credentials (${r.remaining} attempts left)`
          : `Too many failed attempts, account locked`;
        return NextResponse.json(
          { success: false, error: msg },
          { status: r.locked ? 429 : 401 }
        );
      }

      // 明文密码登录成功 → 自动哈希迁移
      if (needsMigration) {
        try {
          const hashed = await hashPassword(password);
          await execute("UPDATE employees SET password = ? WHERE id = ?", [hashed, employee.id]);
        } catch (e) {
          console.warn("Password migration failed for employee:", email);
        }
      }

      if (!employee.active) {
        return NextResponse.json(
          { success: false, error: "Account is inactive" },
          { status: 401 }
        );
      }

      await resetLoginFailure(lockKey);

      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + ADMIN_SESSION_MS);

      // 强制重试写入 session，失败时抛出以便前端知道登录失败
      let sessionInserted = false;
      let lastErr: any = null;
      for (let retry = 0; retry < 3; retry++) {
        try {
          await execute(
            "INSERT INTO sessions (session_id, user_id, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
            [sessionId, employee.id, "admin", formatMySQLDate(expiresAt), formatMySQLDate()]
          );
          sessionInserted = true;
          break;
        } catch (dbError: any) {
          lastErr = dbError;
          console.warn(`Session insert attempt ${retry + 1} failed:`, dbError?.message || String(dbError));
          await new Promise((r) => setTimeout(r, 300 * (retry + 1)));
        }
      }

      if (!sessionInserted) {
        console.error("Failed to create admin session after retries:", lastErr?.message || String(lastErr));
        return NextResponse.json(
          { success: false, error: "登录会话创建失败，请稍后重试" },
          { status: 500 }
        );
      }

      // 为管理员 session 颁发 CSRF token（下单时校验）
      const csrfToken = await issueCsrfToken(sessionId);

      const permissions = typeof employee.permissions === "string"
        ? JSON.parse(employee.permissions)
        : (employee.permissions || {});

      const maxAgeSec = Math.floor(ADMIN_SESSION_MS / 1000);
      const secureCookie = process.env.NODE_ENV === "production" && isHttps;
      const setCookieStr = buildSetCookie({
        name: "session_id",
        value: sessionId,
        maxAgeSec,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
      });

      return jsonWithCookie(
        {
          success: true,
          user: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            role: "super_admin",
            permissions,
          },
          csrfToken,
          sessionMaxAgeSec: maxAgeSec,
        },
        setCookieStr
      );
    } else {
      const agents: any[] = await query(
        "SELECT * FROM agents WHERE email = ?",
        [email]
      );
      const agent = agents[0];

      if (!agent) {
        await recordLoginFailure(lockKey);
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const { ok, needsMigration } = await verifyPassword(password, agent.password);
      if (!ok) {
        const r = await recordLoginFailure(lockKey);
        const msg = r.remaining > 0
          ? `Invalid credentials (${r.remaining} attempts left)`
          : `Too many failed attempts, account locked`;
        return NextResponse.json(
          { success: false, error: msg },
          { status: r.locked ? 429 : 401 }
        );
      }

      // 明文密码登录成功 → 自动哈希迁移
      if (needsMigration) {
        try {
          const hashed = await hashPassword(password);
          await execute("UPDATE agents SET password = ? WHERE id = ?", [hashed, agent.id]);
        } catch (e) {
          console.warn("Password migration failed for agent:", email);
        }
      }

      if (agent.status !== "active") {
        return NextResponse.json(
          { success: false, error: "Account is inactive" },
          { status: 401 }
        );
      }

      await resetLoginFailure(lockKey);

      const sessionId = generateSessionId();
      const expiresAt = new Date(Date.now() + AGENT_SESSION_MS);

      // 强制重试写入 session，失败时抛出以便前端知道登录失败
      let sessionInserted = false;
      let lastErr: any = null;
      for (let retry = 0; retry < 3; retry++) {
        try {
          await execute(
            "INSERT INTO sessions (session_id, user_id, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
            [sessionId, agent.id, "agent", formatMySQLDate(expiresAt), formatMySQLDate()]
          );
          sessionInserted = true;
          break;
        } catch (dbError: any) {
          lastErr = dbError;
          console.warn(`Session insert attempt ${retry + 1} failed:`, dbError?.message || String(dbError));
          await new Promise((r) => setTimeout(r, 300 * (retry + 1)));
        }
      }

      if (!sessionInserted) {
        console.error("Failed to create agent session after retries:", lastErr?.message || String(lastErr));
        return NextResponse.json(
          { success: false, error: "登录会话创建失败，请稍后重试" },
          { status: 500 }
        );
      }

      // 为代理商 session 颁发 CSRF token（下单时校验）
      const csrfToken = await issueCsrfToken(sessionId);

      const maxAgeSec = Math.floor(AGENT_SESSION_MS / 1000);
      const secureCookie = process.env.NODE_ENV === "production" && isHttps;
      const setCookieStr = buildSetCookie({
        name: "session_id",
        value: sessionId,
        maxAgeSec,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookie,
      });

      return jsonWithCookie(
        {
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
          csrfToken,
          sessionMaxAgeSec: maxAgeSec,
        },
        setCookieStr
      );
    }
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
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
      console.log("Session table query failed");
    }

    if (!sessionUser) {
      return NextResponse.json({ authenticated: false });
    }

    // 如果有 CSRF token，也返回给前端（页面刷新时用）
    let csrfToken: string | null = null;
    try {
      const row: any[] = await query(
        "SELECT v FROM kvs WHERE k = ?",
        [`csrf:${sessionId}`]
      ).catch(() => [] as any[]);
      if (row.length > 0 && row[0]?.v) {
        const data = JSON.parse(row[0].v);
        if (!data.expiresAt || Date.now() <= data.expiresAt) {
          csrfToken = data.token;
        }
      }
    } catch {
      /* ignore */
    }

    if (sessionType === "admin") {
      const employees: any[] = await query("SELECT * FROM employees WHERE id = ?", [sessionUser]);
      const employee = employees[0];

      if (!employee) {
        return NextResponse.json({ authenticated: false });
      }

      const permissions = typeof employee.permissions === "string"
        ? JSON.parse(employee.permissions)
        : (employee.permissions || {});

      return NextResponse.json({
        authenticated: true,
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: "super_admin",
          permissions,
        },
        csrfToken,
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
        csrfToken,
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

    const forwardedProto = req.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";
    const secureCookie = process.env.NODE_ENV === "production" && isHttps;

    if (sessionId) {
      try {
        await execute("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
        await execute("DELETE FROM kvs WHERE k = ?", [`csrf:${sessionId}`]).catch(() => {});
      } catch (dbError) {
        console.log("Session table delete failed");
      }
    }

    // 用标准 Set-Cookie 头清除 cookie（Max-Age=0 立即过期）
    const setCookieStr = buildSetCookie({
      name: "session_id",
      value: "",
      maxAgeSec: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
    });

    return jsonWithCookie({ success: true }, setCookieStr);
  } catch (error) {
    console.error("Session deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
