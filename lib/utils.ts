import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "GBP") {
  const symbols: Record<string, string> = {
    GBP: "£",
    USD: "$",
    EUR: "€",
    AUD: "A$",
    CAD: "C$",
  };
  const sym = symbols[currency] || "£";
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(n: number) {
  return n.toLocaleString();
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" });
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Shanghai" });
}

/**
 * 解析后端 orders.date 字段（形如 "2026-08-18 15:43:09"）。
 * 这个字段是服务器本地时间字符串，没有 ISO 时区标记，新旧服务器时区可能不同。
 * 用 Date.UTC 统一构造绝对时刻，保证不同浏览器时区下筛选结果一致。
 */
export function parseOrderDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(0);
  const s = String(dateStr).trim();
  if (!s) return new Date(0);

  // 匹配 YYYY-MM-DD HH:mm:ss （可选毫秒、可选 T 分隔）
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T]?(\d{1,2})?(?::(\d{1,2}))?(?::(\d{1,2}))?/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }
  const [_, y, mo, d, h = "0", mi = "0", se = "0"] = m;
  // 用 Date.UTC 构造，保证不同浏览器时区下得到同一个绝对时刻
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(se)
  );
  return new Date(utcMs);
}

/**
 * 打印面单（图片或 PDF），兼容 iOS Safari 等所有浏览器。
 *
 * 策略：点击后直接在新窗口打开文件，让浏览器用原生 PDF/图片查看器渲染。
 * 用户在查看器里点打印，预览里就只有文件本身，不会带入订单网页内容，
 * 也不存在切换纸张大小后内容消失的问题。
 *
 * 不在当前页用 window.print()：iOS 的 @media print 隐藏在切换纸张时不稳定，
 * 且 iframe.contentWindow.print() 在 iOS 完全不支持。
 */
export function printLabel(url?: string) {
  if (typeof window === "undefined" || !url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
