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
  const hasRedirected = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
      if (!user && !hasRedirected.current) {
        hasRedirected.current = true;
        router.push("/admin/login");
      }
    };
    checkAuth();
  }, [user, router]);

  useEffect(() => {
    if (user) {
      hasRedirected.current = false;
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
  const hasRedirected = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
      if (!user && !hasRedirected.current) {
        hasRedirected.current = true;
        router.push("/login");
      }
    };
    checkAuth();
  }, [user, router]);

  useEffect(() => {
    if (user) {
      hasRedirected.current = false;
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
