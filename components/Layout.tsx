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

  // 检查是否是管理员角色
  const isAdmin = user?.role === "super_admin" || 
                  user?.role === "warehouse_manager" || 
                  user?.role === "finance_manager" || 
                  user?.role === "operations_manager" ||
                  user?.role === "customer_service";

  useEffect(() => {
    if ((!user || !isAdmin) && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [user, isAdmin, router, pathname]);

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0e17]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

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
  const pathname = usePathname();

  // 检查是否是代理商
  const isAgent = user?.role === "agent";

  useEffect(() => {
    if (!user || !isAgent) {
      // 如果是管理员尝试访问代理商页面，跳转到管理员后台
      if (user && user.role !== "agent") {
        router.push("/admin/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, isAgent, router]);

  if (!user || !isAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0e17]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

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