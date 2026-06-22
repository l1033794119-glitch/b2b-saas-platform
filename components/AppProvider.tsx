"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  // 菜单权限：key 为菜单项标识，true = 有权限
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

function getUserFromStorage(): User | null {
  try {
    const savedUser = localStorage.getItem("app.user");
    if (savedUser) return JSON.parse(savedUser);
  } catch {}
  return null;
}

function getLangFromStorage(): Lang {
  try {
    const savedLang = localStorage.getItem("app.lang") as Lang;
    if (savedLang) return savedLang;
  } catch {}
  return "en";
}

function getThemeFromStorage(): "light" | "dark" {
  try {
    const savedTheme = localStorage.getItem("app.theme");
    if (savedTheme === "dark") return "dark";
  } catch {}
  return "light";
}

function getCurrencyFromStorage(): string {
  try {
    const savedCurrency = localStorage.getItem("app.currency");
    if (savedCurrency) return savedCurrency;
  } catch {}
  return "GBP";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLangFromStorage);
  const [theme, setTheme] = useState<"light" | "dark">(getThemeFromStorage);
  const [user, setUser] = useState<User | null>(getUserFromStorage);
  const [currency, setCurrencyState] = useState<string>(getCurrencyFromStorage);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("app.lang", l); } catch {}
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("app.theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
    } catch {}
  };
  const setCurrency = (c: string) => {
    setCurrencyState(c);
    try { localStorage.setItem("app.currency", c); } catch {}
  };

  const login = async (email: string, password: string, admin = false): Promise<boolean> => {
    // Admin login - use employees API
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
          try { localStorage.setItem("app.user", JSON.stringify(empUser)); } catch {}
          return true;
        }
        if (res.status === 403) {
          return false; // account disabled
        }
      } catch (e) {
        console.error("Admin login failed:", e);
      }
      return false;
    }

    // Agent login - use agents API
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
        try { localStorage.setItem("app.user", JSON.stringify(agentUser)); } catch {}
        return true;
      }
    } catch (e) {
      console.error("Agent login failed:", e);
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem("app.user"); } catch {}
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
