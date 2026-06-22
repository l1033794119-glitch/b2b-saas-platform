"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: User | null;
  login: (email: string, password: string, admin?: boolean) => Promise<boolean>;
  logout: () => void;
  currency: string;
  setCurrency: (c: string) => void;
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

function getUserFromStorage(): User | null {
  try {
    const savedUser = localStorage.getItem("app.user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.id) return parsed;
    }
    const rememberToken = getCookie("remember_token");
    if (rememberToken) {
      const savedByToken = localStorage.getItem(`app.user.${rememberToken}`);
      if (savedByToken) {
        const parsed = JSON.parse(savedByToken);
        if (parsed && parsed.id) {
          localStorage.setItem("app.user", savedByToken);
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error("getUserFromStorage error:", e);
  }
  return null;
}

function getLangFromStorage(): Lang {
  try {
    const savedLang = getCookie("app.lang") || localStorage.getItem("app.lang");
    if (savedLang) return savedLang as Lang;
  } catch {}
  return "en";
}

function getThemeFromStorage(): "light" | "dark" {
  try {
    const savedTheme = getCookie("app.theme") || localStorage.getItem("app.theme");
    if (savedTheme === "dark") return "dark";
  } catch {}
  return "light";
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
  const [theme, setTheme] = useState<"light" | "dark">(getThemeFromStorage);
  const [user, setUser] = useState<User | null>(getUserFromStorage);
  const [currency, setCurrencyState] = useState<string>(getCurrencyFromStorage);
  const isInitialized = useRef(false);

  // 初始化完成后设置状态
  useEffect(() => {
    const storedUser = getUserFromStorage();
    if (storedUser && !user) {
      setUser(storedUser);
    }
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      setCookie("app.lang", l, 365);
      localStorage.setItem("app.lang", l);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      setCookie("app.theme", next, 365);
      localStorage.setItem("app.theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
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
    if (admin) {
      try {
        const res = await fetch(
          `/api/employees?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        );
        const data = await res.json();
        if (res.ok && data && data.id) {
          const empUser: User = {
            id: data.id,
            name: data.name,
            email: data.email,
            role: "super_admin",
            permissions: data.permissions,
          };
          setUser(empUser);
          try {
            // 生成唯一标识符并存储
            const userToken = `admin_${data.id}_${Date.now()}`;
            setCookie("remember_token", userToken, 30); // 30 天有效期
            localStorage.setItem(`app.user.${userToken}`, JSON.stringify(empUser));
            localStorage.setItem("app.user", JSON.stringify(empUser)); // 兼容旧方式
          } catch {}
          return true;
        }
        if (res.status === 403) {
          return false;
        }
      } catch (e) {
        console.error("Admin login failed:", e);
      }
      return false;
    }

    try {
      const res = await fetch(`/api/agents?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (res.ok && data && data.id) {
        const agentUser: User = {
          id: data.id,
          name: data.contact || data.company,
          email: data.email,
          role: "agent",
          company: data.company,
          country: data.country,
          level: data.level,
        };
        setUser(agentUser);
        try {
          // 生成唯一标识符并存储
          const userToken = `agent_${data.id}_${Date.now()}`;
          setCookie("remember_token", userToken, 30);
          localStorage.setItem(`app.user.${userToken}`, JSON.stringify(agentUser));
          localStorage.setItem("app.user", JSON.stringify(agentUser));
        } catch {}
        return true;
      }
    } catch (e) {
      console.error("Agent login failed:", e);
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    try {
      const rememberToken = getCookie("remember_token");
      if (rememberToken) {
        localStorage.removeItem(`app.user.${rememberToken}`);
        deleteCookie("remember_token");
      }
      localStorage.removeItem("app.user");
    } catch {}
  };

  const value: AppContextValue = {
    lang,
    setLang,
    t: (k) => translate(lang, k),
    theme,
    toggleTheme,
    user,
    login,
    logout,
    currency,
    setCurrency,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export { languageLabels };
