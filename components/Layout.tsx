"use client";

import { useState, useEffect, useRef } from "react";
import { AdminSidebar, AgentSidebar, Topbar } from "./Sidebar";
import { useApp } from "./AppProvider";
import { useRouter, usePathname } from "next/navigation";
import { getAdminDefaultHref } from "@/lib/admin-menu";

export function AdminLayout({ children, title, subtitle }:
  { children: React.ReactNode; title: string; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user?.role === "super_admin" || 
                  user?.role === "warehouse_manager" || 
                  user?.role === "finance_manager" || 
                  user?.role === "operations_manager" ||
                  user?.role === "customer_service";

  useEffect(() => {
    // user 为 null 时说明 AppProvider 仍在初始化 session，此时不跳转
    // 等待 AppProvider checkSession 完成后再判断
    if (user === null) return;
    if (!isAdmin && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
    if (user && isAdmin && user.permissions) {
      const defaultHref = getAdminDefaultHref(user.permissions);
      const isDashboard = pathname === "/admin/dashboard";
      const hasDashboardAccess = user.permissions.dashboard === true;
      if (isDashboard && !hasDashboardAccess) {
        router.push(defaultHref);
      }
    }
  }, [user, isAdmin, router, pathname]);

  // user 为 null 时（AppProvider 仍在初始化 session），显示 loading
  if (user === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 dark:border-slate-700 border-t-[#34c759]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 dark:border-slate-700 border-t-[#34c759]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex lg:ml-[280px] flex-col">
        <Topbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="max-w-[1600px] mx-auto">
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

  const isAgent = user?.role === "agent";

  useEffect(() => {
    // user 为 null 时说明 AppProvider 仍在初始化 session，此时不跳转
    if (user === null) return;
    if (!isAgent) {
      if (user && user.role !== "agent") {
        router.push("/admin/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, isAgent, router]);

  // user 为 null 时（AppProvider 仍在初始化 session），显示 loading
  if (user === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 dark:border-slate-700 border-t-[#34c759]" />
      </div>
    );
  }

  if (!isAgent) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 dark:border-slate-700 border-t-[#34c759]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <AgentSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex lg:ml-[280px] flex-col">
        <Topbar title={title} subtitle={subtitle} onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
