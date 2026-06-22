"use client";

import { useState, useEffect, useRef } from "react";
import { AdminSidebar, AgentSidebar, Topbar } from "./Sidebar";
import { useApp } from "./AppProvider";
import { useRouter, usePathname } from "next/navigation";

export function AdminLayout({ children, title, subtitle }:
  { children: React.ReactNode; title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const hasChecked = useRef(false);

  useEffect(() => {
    // 延迟检查，确保 AppProvider 已经完成状态初始化
    const timer = setTimeout(() => {
      if (!user && !hasChecked.current) {
        hasChecked.current = true;
        router.push("/admin/login");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [user, router]);

  // 如果用户已登录，重置检查标记
  useEffect(() => {
    if (user) {
      hasChecked.current = false;
    }
  }, [user]);

  if (!user) return null;

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

  useEffect(() => {
    // 延迟检查，确保 AppProvider 已经完成状态初始化
    const timer = setTimeout(() => {
      if (!user && !hasChecked.current) {
        hasChecked.current = true;
        router.push("/login");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [user, router]);

  // 如果用户已登录，重置检查标记
  useEffect(() => {
    if (user) {
      hasChecked.current = false;
    }
  }, [user]);

  if (!user) return null;

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
