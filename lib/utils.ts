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
 * iOS 不支持 iframe.contentWindow.print()，也无法可靠打印 iframe 内的 PDF 内容。
 * 解决：PDF 用 pdf.js 渲染成 canvas 后再调用 window.print()，并通过 @media print
 * 隐藏页面其它元素，只让 overlay 内的内容出现在打印预览中。
 */
export function printLabel(url?: string) {
  if (typeof window === "undefined" || !url) return;

  // 清理上一次的 overlay
  const old = document.getElementById("print-label-overlay");
  if (old) old.remove();

  // 注入一次性打印样式（重复调用时复用）
  let styleEl = document.getElementById("print-label-style") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "print-label-style";
    styleEl.textContent = `
      @media print {
        html, body { width: 100%; height: 100%; margin: 0 !important; padding: 0 !important; }
        body > *:not(#print-label-overlay) { display: none !important; }
        #print-label-overlay {
          display: block !important;
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important; height: auto !important;
        }
        #print-label-overlay img,
        #print-label-overlay canvas {
          max-width: 100% !important;
          width: 100% !important;
          height: auto !important;
          display: block !important;
          page-break-after: always;
        }
        #print-label-overlay img:last-child,
        #print-label-overlay canvas:last-child {
          page-break-after: auto;
        }
        @page { size: auto; margin: 0; }
      }
    `;
    document.head.appendChild(styleEl);
  }

  const overlay = document.createElement("div");
  overlay.id = "print-label-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:auto;padding:16px;";
  document.body.appendChild(overlay);

  const cleanup = () => {
    try {
      overlay.remove();
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  // 兜底：60 秒后强制移除
  window.setTimeout(cleanup, 60000);

  const triggerPrint = () => {
    window.focus();
    window.print();
  };

  const isPdf = url.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    // 图片：直接显示后打印
    const img = document.createElement("img");
    img.src = url;
    img.alt = "label";
    img.style.cssText = "max-width:100%;height:auto;display:block;";
    overlay.appendChild(img);
    if (img.complete) {
      window.setTimeout(triggerPrint, 100);
    } else {
      img.onload = () => triggerPrint();
    }
    return;
  }

  // PDF：用 pdf.js 渲染成 canvas（跨平台最可靠，iOS 也能正确打印）
  const loading = document.createElement("div");
  loading.style.cssText = "margin:auto;font-size:16px;color:#333;";
  loading.textContent = "正在加载 PDF…";
  overlay.appendChild(loading);

  const renderPdf = async () => {
    try {
      // 懒加载 pdf.js
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("pdf.js load failed"));
          document.head.appendChild(s);
        });
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      }
      const pdfjsLib = (window as any).pdfjsLib;
      const pdf = await pdfjsLib.getDocument(url).promise;

      overlay.innerHTML = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = "max-width:100%;height:auto;display:block;margin-bottom:10px;";
        overlay.appendChild(canvas);
        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;
      }
      window.setTimeout(triggerPrint, 300);
    } catch (e) {
      console.error("PDF 渲染失败，降级为新窗口打开：", e);
      cleanup();
      window.open(url, "_blank");
    }
  };

  renderPdf();
}
