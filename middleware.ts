import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 不需要鉴权的公开路径
const PUBLIC_PATHS = [
  "/api/auth/session",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 只拦截 /api/ 开头的请求
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 公开路径直接放行
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 检查 session_id cookie 是否存在
  // 注意：middleware 运行在 Edge Runtime，无法访问 MySQL
  // 真正的会话校验在各个 API route 内通过 lib/auth.ts 完成
  const sessionId = req.cookies.get("session_id")?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Unauthorized - Session required" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
