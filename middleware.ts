import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // 不做全局鉴权拦截，交给各 API route 通过 requireAuth() 自行校验
  // 全局拦截会导致：cookie 未正确发送时所有 API 返回 401，前端收到非数组数据报错
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
