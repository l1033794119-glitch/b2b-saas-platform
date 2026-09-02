"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { Lang, languageLabels, translate } from "@/lib/i18n";

type Role =
  | "super_admin"
  | "warehouse_manager"
  | "finance_manager"
  | "operations_manager"
  | "customer_service"
  | "agent";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
  country?: string;
  level?: "A" | "B" | "C";
  skipCaptcha?: boolean;
  permissions?: Record<string, boolean>;
}

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  user: User | null;
  login: (email: string, password: string, admin?: boolean) => Promise<boolean>;
  logout: () => void;
  currency: string;
  setCurrency: (c: string) => void;
  csrfToken: string | null;
  setCsrfToken: (token: string | null) => void;
  lastLoginError: React.MutableRefObject<string>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AppContext = createContext<AppContextValue | null>(null);

function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const encodedValue = encodeURIComponent(value);
  document.cookie = `${name}=${encodedValue};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

function getLangFromStorage(): Lang {
  try {
    const savedLang = getCookie("app.lang") || localStorage.getItem("app.lang");
    if (savedLang) return savedLang as Lang;
  } catch {}
  return "en";
}

function getCurrencyFromStorage(): string {
  try {
    const savedCurrency = getCookie("app.currency") || localStorage.getItem("app.currency");
    if (savedCurrency) return savedCurrency;
  } catch {}
  return "GBP";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLangFromStorage);
  const [user, setUser] = useState<User | null>(null);
  const [currency, setCurrencyState] = useState<string>(getCurrencyFromStorage);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const lastLoginError = useRef<string>("");
  const userRef = useRef<User | null>(null);

  // 同步 user 到 ref，供 apiFetch 使用
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 401 处理中防止重复跳转
  const redirectingRef = useRef(false);

  // 性能优化：同 URL 的 GET 请求做 10s 内存去重缓存（防止同一渲染循环多次发起）
  const fetchCacheRef = useRef<Map<string, { ts: number; prom: Promise<Response> }>>(new Map());
  const FETCH_CACHE_TTL = 10000; // 10s

  const apiFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    // 关键修复：当 body 是 FormData 时，绝对不能手动设置 Content-Type，
    // 必须让浏览器自动生成带 boundary 的 multipart/form-data；
    // 否则后端 req.formData() 无法解析，导致上传失败。
    const isFormData =
      typeof FormData !== "undefined" && options?.body instanceof FormData;
    const method = (options?.method || "GET").toUpperCase();

    const mergedHeaders = isFormData
      ? { ...(options?.headers || {}) } // FormData: 不注入任何 Content-Type
      : {
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        };

    // 性能：GET 同 URL 10s 内共享同一个 Promise（请求去重）
    let cacheKey: string | null = null;
    if (method === "GET" && !options?.cache) {
      cacheKey = `${url}`;
      const cached = fetchCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.ts < FETCH_CACHE_TTL) {
        try {
          // 必须克隆响应，否则消费了之后第二次 .json() 会报错
          const origRes = await cached.prom;
          try {
            const cloned = origRes.clone();
            return cloned;
          } catch {
            return origRes;
          }
        } catch {
          fetchCacheRef.current.delete(cacheKey);
        }
      }
    }

    // 关键：超时 15s 兜底（AbortController），避免慢 SQL 让整页白屏
    const userSignal = options?.signal as AbortSignal | undefined;
    const timeoutCtrl = new AbortController();
    const timeoutMs = 15000;
    const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
    const combinedSignal: AbortSignal = userSignal
      ? (() => {
          // 两个任一触发就 abort
          const ctrl = new AbortController();
          const onAbort = () => ctrl.abort();
          userSignal.addEventListener("abort", onAbort, { once: true });
          timeoutCtrl.signal.addEventListener("abort", onAbort, { once: true });
          return ctrl.signal;
        })()
      : timeoutCtrl.signal;

    const defaultOptions: RequestInit = {
      credentials: "include",
      headers: mergedHeaders,
      method,
      signal: combinedSignal,
    };

    let res: Response;
    const doFetch = (async () => {
      try {
        const r = await fetch(url, { ...defaultOptions, ...options, signal: combinedSignal });
        return r;
      } catch (err: any) {
        console.error("apiFetch error:", url, err?.name || err?.message || err);
        // 超时 / 网络错误 —— 构造一个 504/500 响应，避免 Promise.all 卡着
        const isTimeout = err?.name === "AbortError" || /abort|timeout/i.test(err?.message || "");
        return new Response(
          JSON.stringify({
            error: isTimeout ? `Request timed out (${timeoutMs / 1000}s)` : "Network error",
          }),
          {
            status: isTimeout ? 504 : 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      } finally {
        clearTimeout(timer);
      }
    })();

    if (cacheKey) {
      fetchCacheRef.current.set(cacheKey, { ts: Date.now(), prom: doFetch });
      // 5 分钟后强制清缓存，防止陈旧
      setTimeout(() => fetchCacheRef.current.delete(cacheKey!), 300_000);
    }

    res = await doFetch;

    // 401 未授权 → 清除登录态并跳转登录页
    if (res.status === 401 && !redirectingRef.current) {
      redirectingRef.current = true;
      setUser(null);
      setCsrfToken(null);
      localStorage.removeItem("app.user");
      setTimeout(() => {
        redirectingRef.current = false;
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/admin")) {
          window.location.href = "/admin/login";
        } else if (currentPath.startsWith("/agent")) {
          window.location.href = "/login";
        } else if (currentPath !== "/login" && currentPath !== "/admin/login") {
          window.location.href = "/";
        }
      }, 100);
    }

    return res;
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem("app.user", JSON.stringify(data.user));
          if (data.csrfToken) {
            setCsrfToken(data.csrfToken);
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        setIsSessionChecked(true);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      setCookie("app.lang", l, 365);
      localStorage.setItem("app.lang", l);
    } catch {}
  };

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    try {
      setCookie("app.currency", c, 365);
      localStorage.setItem("app.currency", c);
    } catch {}
  };

  const login = async (email: string, password: string, admin = false): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, admin }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 登录失败：401 凭据错误 / 429 锁定 / 500 会话创建失败
        lastLoginError.current = data.error || `登录失败 (${res.status})`;
        console.warn("Login failed:", { status: res.status, error: data.error });
        return false;
      }

      if (data.success && data.user) {
        // === 关键修复：Next.js 14.2.15 的 response.cookies.set() 会把 cookie 放到
        // x-middleware-set-cookie 头而非标准 Set-Cookie 头，浏览器不识别导致 cookie 丢失。
        // 这里从响应 body 中取 sessionId，用 document.cookie 手动写入。
        // 注意：JS document.cookie 设置 Secure cookie 在部分浏览器（Safari）上受限，
        // 所以先不带 Secure 写入；如果写入后读不到，立即带 SameSite=None 重试。 ===
        if (data.sessionId) {
          const maxAge = data.sessionMaxAgeSec || 28800;

          // 第一轮：最兼容的写法（不加 Secure，避免 Safari 拒绝 JS 设置 Secure cookie）
          const cookieV1 = `b2b_sid=${data.sessionId}; path=/; max-age=${maxAge}; SameSite=Lax`;
          document.cookie = cookieV1;

          // 验证是否写入成功
          if (!document.cookie.includes("b2b_sid=")) {
            // 第二轮：SameSite 也去掉（极个别浏览器对 SameSite + JS 设置不兼容）
            const cookieV2 = `b2b_sid=${data.sessionId}; path=/; max-age=${maxAge}`;
            document.cookie = cookieV2;
          }
          if (!document.cookie.includes("b2b_sid=")) {
            // 第三轮：尝试 SameSite=None + Secure（只有服务端 Set-Cookie 真的能设 Secure，但试试）
            const cookieV3 = `b2b_sid=${data.sessionId}; path=/; max-age=${maxAge}; SameSite=None; Secure`;
            document.cookie = cookieV3;
          }
        }

        // 等待 cookie 写入完成
        await new Promise((r) => setTimeout(r, 200));

        // GET 校验 session 是否真的生效
        let verified = false;
        let lastVerifyError = "";
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const verifyRes = await fetch("/api/auth/session", {
              method: "GET",
              credentials: "include",
            });
            const v = await verifyRes.json();
            if (v.authenticated && v.user) {
              verified = true;
              break;
            } else {
              lastVerifyError = v.error || "Session not authenticated";
            }
          } catch (e: any) {
            lastVerifyError = e?.message || "Verify request failed";
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        if (!verified) {
          lastLoginError.current = `Session 验证失败: ${lastVerifyError || "请稍后重试"}`;
          console.error("Login session verification failed after retries");
          return false;
        }

        setUser(data.user);
        localStorage.setItem("app.user", JSON.stringify(data.user));
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
        return true;
      }
      lastLoginError.current = data.error || "Login failed";
      return false;
    } catch (error: any) {
      console.error("Login failed:", error);
      lastLoginError.current = error?.message || "Network error, please try again";
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}

    // 手动清除 b2b_sid cookie（与 login 中的设置对应）
    document.cookie = "b2b_sid=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    setUser(null);
    setCsrfToken(null);
    localStorage.removeItem("app.user");
  };

  const value: AppContextValue = {
    lang,
    setLang,
    t: (k) => translate(lang, k),
    user,
    login,
    logout,
    currency,
    setCurrency,
    csrfToken,
    setCsrfToken,
    lastLoginError,
    apiFetch,
  };

  return (
    <AppContext.Provider value={value}>
      {isSessionChecked ? children : (
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0e17]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export { languageLabels };
