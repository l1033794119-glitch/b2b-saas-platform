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

  const apiFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    const defaultOptions: RequestInit = {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    };

    let res: Response;
    try {
      res = await fetch(url, { ...defaultOptions, ...options });
    } catch (err) {
      console.error("apiFetch network error:", err);
      // 构造一个 500 响应
      return new Response(JSON.stringify({ error: "Network error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

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
        // 这里从响应 body 中取 sessionId，用 document.cookie 手动写入。===
        if (data.sessionId) {
          const maxAge = data.sessionMaxAgeSec || 28800;
          const isHttps = window.location.protocol === "https:";
          const secureFlag = isHttps ? "; Secure" : "";
          document.cookie = `sid=${data.sessionId}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
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

    // 手动清除 sid cookie（与 login 中的设置对应）
    document.cookie = "sid=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

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
