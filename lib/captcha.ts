// hCaptcha token 校验工具
// 文档: https://docs.hcaptcha.com/#verify-the-user-response-server-side
//
// 测试用 key（始终通过）：
//   site key:    10000000-ffff-ffff-ffff-000000000001
//   secret key:  0x0000000000000000000000000000000000000000
//
// 生产用 key：去 https://dashboard.hcaptcha.com 注册免费账号后替换

const VERIFY_URL = "https://api.hcaptcha.com/siteverify";

/**
 * 校验 hCaptcha token
 * @param token 前端传来的 h-captcha-response
 * @param remoteIp 用户 IP（可选，用于风控）
 * @returns true 验证通过；false 验证失败
 */
export async function verifyCaptcha(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.HCAPTCHA_SECRET_KEY || "0x0000000000000000000000000000000000000000";

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);
    if (remoteIp) params.append("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("hCaptcha verify HTTP error:", res.status, res.statusText);
      return false;
    }

    const data = await res.json();
    // 测试 secret 下 success 永远为 true
    // 真实 secret 下 success 表示验证通过
    return !!data.success;
  } catch (err) {
    console.error("hCaptcha verify failed:", err);
    return false;
  }
}

/**
 * 获取前端要用的 sitekey
 * 优先用环境变量，没有则用测试 key
 */
export function getSiteKey(): string {
  return process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001";
}
