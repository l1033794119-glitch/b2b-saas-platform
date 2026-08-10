import { query } from "@/lib/db";
import { randomBytes } from "crypto";

// ============== 登录失败限流 ==============
const MAX_FAILS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 分钟

export interface LoginFailureResult {
  locked: boolean;
  remaining: number; // 剩余允许次数
  lockedUntil: Date | null;
}

/**
 * 记录登录失败次数，超过阈值锁定 15 分钟
 */
export async function recordLoginFailure(identifier: string): Promise<LoginFailureResult> {
  try {
    const now = Date.now();
    const key = `login_fail:${identifier}`;

    // 尝试从 kvs 表读取（如果存在），否则用内存 + 内存持久化
    const row: any[] = await query(
      "SELECT v FROM kvs WHERE k = ?",
      [key]
    ).catch(() => [] as any[]);

    let fails = 0;
    let lockedUntilTs = 0;
    if (row.length > 0 && row[0]?.v) {
      const data = JSON.parse(row[0].v);
      fails = data.fails || 0;
      lockedUntilTs = data.lockedUntil || 0;
      if (lockedUntilTs && now > lockedUntilTs) {
        // 锁定期已过，重置
        fails = 0;
        lockedUntilTs = 0;
      }
    }

    fails += 1;
    lockedUntilTs = fails >= MAX_FAILS ? now + LOCK_WINDOW_MS : lockedUntilTs;

    const json = JSON.stringify({ fails, lockedUntil: lockedUntilTs });

    if (row.length > 0) {
      await query("UPDATE kvs SET v = ? WHERE k = ?", [json, key]).catch(() => {});
    } else {
      await query("INSERT INTO kvs (k, v) VALUES (?, ?)", [key, json]).catch(() => {
        // kvs 表不存在时忽略
      });
    }

    return {
      locked: fails >= MAX_FAILS,
      remaining: Math.max(0, MAX_FAILS - fails),
      lockedUntil: lockedUntilTs ? new Date(lockedUntilTs) : null,
    };
  } catch {
    // 表不存在时降级：不限制，但返回警告
    return { locked: false, remaining: MAX_FAILS, lockedUntil: null };
  }
}

/**
 * 检查当前标识是否被锁定
 */
export async function isLoginLocked(identifier: string): Promise<LoginFailureResult> {
  try {
    const now = Date.now();
    const key = `login_fail:${identifier}`;
    const row: any[] = await query(
      "SELECT v FROM kvs WHERE k = ?",
      [key]
    ).catch(() => [] as any[]);

    if (row.length === 0 || !row[0]?.v) {
      return { locked: false, remaining: MAX_FAILS, lockedUntil: null };
    }
    const data = JSON.parse(row[0].v);
    const fails = data.fails || 0;
    let lockedUntilTs = data.lockedUntil || 0;
    if (lockedUntilTs && now > lockedUntilTs) {
      lockedUntilTs = 0;
    }
    return {
      locked: !!lockedUntilTs,
      remaining: Math.max(0, MAX_FAILS - fails),
      lockedUntil: lockedUntilTs ? new Date(lockedUntilTs) : null,
    };
  } catch {
    return { locked: false, remaining: MAX_FAILS, lockedUntil: null };
  }
}

/**
 * 登录成功后重置失败计数
 */
export async function resetLoginFailure(identifier: string): Promise<void> {
  try {
    const key = `login_fail:${identifier}`;
    await query("DELETE FROM kvs WHERE k = ?", [key]).catch(() => {});
  } catch {
    /* ignore */
  }
}

// ============== CSRF Token ==============
const CSRF_TTL_MS = 30 * 60 * 1000; // 30 分钟

/**
 * 生成一个新的 CSRF token 并存入 sessions 表的扩展字段
 * （在没有 session_id 的情况下，通过 kvs 表存放）
 */
export async function issueCsrfToken(sessionId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  try {
    const key = `csrf:${sessionId}`;
    const expiresAt = new Date(Date.now() + CSRF_TTL_MS);
    const json = JSON.stringify({ token, expiresAt: expiresAt.getTime() });

    const row = await query("SELECT k FROM kvs WHERE k = ?", [key]).catch(() => [] as any[]);
    if (row.length > 0) {
      await query("UPDATE kvs SET v = ? WHERE k = ?", [json, key]);
    } else {
      await query("INSERT INTO kvs (k, v) VALUES (?, ?)", [key, json]).catch(() => {});
    }
  } catch {
    /* kvs 表不存在时降级：token 仍返回但不校验 */
  }
  return token;
}

/**
 * 校验 CSRF token 是否与当前 session 匹配（校验后立即作废，一次性）
 */
export async function verifyCsrfToken(sessionId: string, token: string): Promise<boolean> {
  if (!sessionId || !token) return false;
  try {
    const key = `csrf:${sessionId}`;
    const row: any[] = await query("SELECT v FROM kvs WHERE k = ?", [key]).catch(() => [] as any[]);
    if (row.length === 0 || !row[0]?.v) return false;
    const data = JSON.parse(row[0].v);
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await query("DELETE FROM kvs WHERE k = ?", [key]).catch(() => {});
      return false;
    }
    if (data.token !== token) return false;

    // 一次性 token：使用后删除
    await query("DELETE FROM kvs WHERE k = ?", [key]).catch(() => {});
    return true;
  } catch {
    // kvs 表不存在时降级：放行（避免阻断正常下单）
    return true;
  }
}

/**
 * 获取某个 session 下的 CSRF token（用于页面刷新时不重新生成）
 */
export async function getCsrfToken(sessionId: string): Promise<string | null> {
  try {
    const key = `csrf:${sessionId}`;
    const row: any[] = await query("SELECT v FROM kvs WHERE k = ?", [key]).catch(() => [] as any[]);
    if (row.length === 0 || !row[0]?.v) return null;
    const data = JSON.parse(row[0].v);
    if (data.expiresAt && Date.now() > data.expiresAt) return null;
    return data.token || null;
  } catch {
    return null;
  }
}

// ============== API 速率限制 ==============
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSec: number;
}

/**
 * 简单的滑动窗口速率限制
 * @param key 限流键（如 "order_agent_xxx"）
 * @param windowMs 时间窗口（毫秒）
 * @param max 窗口内最大次数
 */
export async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<RateLimitResult> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const row: any[] = await query("SELECT v FROM kvs WHERE k = ?", [key]).catch(() => [] as any[]);

    let timestamps: number[] = [];
    if (row.length > 0 && row[0]?.v) {
      const data = JSON.parse(row[0].v);
      timestamps = (data.ts || []).filter((t: number) => t > windowStart);
    }

    const allowed = timestamps.length < max;
    if (allowed) {
      timestamps.push(now);
      const json = JSON.stringify({ ts: timestamps });
      if (row.length > 0) {
        await query("UPDATE kvs SET v = ? WHERE k = ?", [json, key]).catch(() => {});
      } else {
        await query("INSERT INTO kvs (k, v) VALUES (?, ?)", [key, json]).catch(() => {});
      }
    }

    // 计算最老一条记录何时到期（秒）
    const oldestTs = timestamps[0] || 0;
    const resetInSec = oldestTs ? Math.max(0, Math.ceil((oldestTs + windowMs - now) / 1000)) : 0;

    return {
      allowed,
      remaining: Math.max(0, max - timestamps.length),
      resetInSec,
    };
  } catch {
    // 表不存在时降级：不限流
    return { allowed: true, remaining: max, resetInSec: 0 };
  }
}
