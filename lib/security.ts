import { scrypt, randomBytes, timingSafeEqual } from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;
const COST = 16384; // scrypt cost parameter (N)

/**
 * 使用 scrypt 哈希密码（无需安装 bcrypt，Node.js 内置）
 * 输出格式: $scrypt$N=16384$salt_b64$hash_b64
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived: Buffer = await new Promise((resolve, reject) => {
    scrypt(Buffer.from(password), salt, KEY_LEN, { N: COST }, (err, buf) => {
      if (err) reject(err);
      else resolve(buf);
    });
  });
  const saltB64 = salt.toString("base64");
  const hashB64 = derived.toString("base64");
  return `$scrypt$N=${COST}$${saltB64}$${hashB64}`;
}

/**
 * 校验密码
 * 支持两种格式：
 * 1. 新格式：$scrypt$N=...$salt$hash（scrypt 哈希）
 * 2. 旧格式：纯文本明文密码（无 $ 前缀）
 * 返回值：
 *   { ok: true,  needsMigration: false }  哈希匹配
 *   { ok: true,  needsMigration: true  }  明文匹配，需要迁移成哈希
 *   { ok: false, needsMigration: false }  不匹配
 */
export async function verifyPassword(
  password: string,
  stored: string | undefined | null
): Promise<{ ok: boolean; needsMigration: boolean }> {
  if (!stored) return { ok: false, needsMigration: false };
  if (!password) return { ok: false, needsMigration: false };

  // 新格式：scrypt 哈希
  if (stored.startsWith("$scrypt$")) {
    try {
      const parts = stored.split("$");
      // parts: ["", "scrypt", "N=16384", saltB64, hashB64]
      if (parts.length !== 5) return { ok: false, needsMigration: false };
      const salt = Buffer.from(parts[3], "base64");
      const expected = Buffer.from(parts[4], "base64");
      const n = parseInt(parts[2].split("=")[1], 10) || COST;
      if (!salt.length || !expected.length) return { ok: false, needsMigration: false };

      const derived: Buffer = await new Promise<Buffer>((resolve, reject) => {
        scrypt(Buffer.from(password), salt, expected.length, { N: n }, (err, buf) => {
          if (err) reject(err);
          else resolve(buf);
        });
      });

      if (derived.length !== expected.length) return { ok: false, needsMigration: false };
      const ok = timingSafeEqual(derived, expected);
      return { ok, needsMigration: false };
    } catch (e) {
      console.error("verifyPassword scrypt error:", e);
      return { ok: false, needsMigration: false };
    }
  }

  // 旧格式：明文直接比较
  // 优先用 timingSafeEqual（防止时序攻击），失败时回退到字符串比较（兼容编码差异）
  try {
    const passBuf = Buffer.from(password);
    const storedBuf = Buffer.from(stored);
    if (passBuf.length === storedBuf.length && timingSafeEqual(passBuf, storedBuf)) {
      return { ok: true, needsMigration: true };
    }
  } catch (e) {
    // timingSafeEqual 可能因 Buffer 格式问题抛错，回退到字符串比较
    console.warn("verifyPassword timingSafeEqual fallback:", (e as Error)?.message);
  }

  // 字符串回退比较（同时尝试 trim 去除两端空白，兼容历史数据）
  const directMatch = password === stored;
  const trimMatch = password.trim() === stored.trim();
  if (directMatch || trimMatch) {
    return { ok: true, needsMigration: true };
  }

  return { ok: false, needsMigration: false };
}

/**
 * 检查存储的密码是否是明文（需要迁移）
 */
export function isPlaintextPassword(stored: string | undefined | null): boolean {
  if (!stored) return false;
  return !stored.startsWith("$scrypt$");
}
