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
  const [user, setUser] = useState<User | null>(null);
  const [currency, setCurrencyState] = useState<string>(getCurrencyFromStorage);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

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
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, admin }),
      });
      
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem("app.user", JSON.stringify(data.user));
        return true;
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
    return false;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
    
    setUser(null);
    localStorage.removeItem("app.user");
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
  
  return (
    <AppContext.Provider value={value}>
      {isSessionChecked ? children : (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0e17]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
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