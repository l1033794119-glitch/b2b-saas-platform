"use client";

import { useState, useEffect, useRef } from "react";
import { AdminSidebar, AgentSidebar, Topbar } from "./Sidebar";
import { useApp } from "./AppProvider";
import { useRouter, usePathname } from "next/navigation";

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function AdminLayout({ children, title, subtitle }:
  { children: React.ReactNode; title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const hasChecked = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rememberToken = getCookie("remember_token");
    const hasToken = !!rememberToken;
    
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!user && !hasChecked.current && !hasToken) {
        hasChecked.current = true;
        router.push("/admin/login");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    if (user) {
      hasChecked.current = false;
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0e17]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const rememberToken = getCookie("remember_token");
  if (!user && !rememberToken) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0e17]">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AgentLayout({ children, title, subtitle }:
  { children: React.ReactNode; title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  const router = useRouter();
  const hasChecked = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rememberToken = getCookie("remember_token");
    const hasToken = !!rememberToken;
    
    const timer = setTimeout(() => {
      setIsLoading(false);
      if (!user && !hasChecked.current && !hasToken) {
        hasChecked.current = true;
        router.push("/login");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    if (user) {
      hasChecked.current = false;
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0e17]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const rememberToken = getCookie("remember_token");
  if (!user && !rememberToken) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0e17]">
      <AgentSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
