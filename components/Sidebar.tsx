"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import {
  LayoutDashboard, Package, Warehouse, Users, ShoppingCart, Truck,
  LineChart, Bell, Settings, UsersRound, FileText, Search, Moon, Sun,
  LogOut, ChevronDown, Menu, X, CreditCard,
} from "lucide-react";
import { useState } from "react";
import { Lang, languageLabels } from "@/lib/i18n";
import { useCart } from "@/lib/cart";

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, user } = useApp();
  const pathname = usePathname();

  // 菜单项：key 必须与 employees API 中的权限 key 一致
  const allItems = [
    { href: "/admin/dashboard", key: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/products", key: "products", label: t("products"), icon: Package },
    { href: "/admin/inventory", key: "inventory", label: t("inventory"), icon: Warehouse },
    { href: "/admin/warehouse", key: "warehouse", label: t("warehouses"), icon: Warehouse },
    { href: "/admin/agents", key: "agents", label: t("agents"), icon: Users },
    { href: "/admin/credit", key: "credit", label: t("credit_limits") || "Credit Limits", icon: CreditCard },
    { href: "/admin/orders", key: "orders", label: t("orders"), icon: ShoppingCart },
    { href: "/admin/shipping", key: "shipping", label: t("shipping"), icon: Truck },
    { href: "/admin/finance", key: "finance", label: t("finance"), icon: LineChart },
    { href: "/admin/analytics", key: "analytics", label: t("analytics"), icon: LineChart },
    { href: "/admin/notifications", key: "notifications", label: t("notifications"), icon: Bell },
    { href: "/admin/employees", key: "employees", label: t("employees"), icon: UsersRound },
    { href: "/admin/audit-logs", key: "audit_logs", label: t("audit_logs"), icon: FileText },
    { href: "/admin/settings", key: "settings", label: t("settings"), icon: Settings },
  ];

  // 根据用户权限过滤菜单项
  const items = allItems.filter((it) => {
    // 无 permissions 字段（代理商或旧数据）显示所有菜单
    if (!user?.permissions) return true;
    // permissions[key] === true 才显示
    return user.permissions[it.key] === true;
  });

  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-white dark:bg-[#0f1320] border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">B</div>
            <span>B2B Console</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {items.map((it) => {
            const active = pathname === it.href;
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onClose}
                className={`sidebar-link ${active ? "active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold">
                {(user?.name || "A").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name || "Admin"}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email || ""}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function AgentSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, user } = useApp();
  const { count } = useCart();
  const pathname = usePathname();
  const items = [
    { href: "/agent/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/agent/catalog", label: t("product_catalog"), icon: Package },
    { href: "/agent/cart", label: t("shopping_cart"), icon: ShoppingCart, badge: count },
    { href: "/agent/orders", label: t("orders"), icon: FileText },
    { href: "/agent/addresses", label: t("addresses"), icon: UsersRound },
    { href: "/agent/settings", label: t("profile"), icon: Settings },
  ];
  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] bg-white dark:bg-[#0f1320] border-r border-slate-200 dark:border-slate-800 z-40 flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link href="/agent/dashboard" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">A</div>
            <span>Agent Portal</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {items.map((it) => {
            const active = pathname === it.href;
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href} onClick={onClose} className={`sidebar-link ${active ? "active" : ""}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm flex-1">{it.label}</span>
                {it.badge && it.badge > 0 ? (
                  <span className="ml-auto text-xs bg-indigo-600 text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-medium">
                    {it.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-white flex items-center justify-center text-sm font-semibold">
                {(user?.name || "A").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.company || user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email || ""}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ title, onMenu, subtitle }: { title: string; onMenu: () => void; subtitle?: string }) {
  const { t, theme, toggleTheme, lang, setLang, currency, setCurrency, user, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const langs: Lang[] = ["en", "zh-CN", "zh-TW"];

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">
        <button onClick={onMenu} className="lg:hidden text-slate-700 dark:text-slate-300 p-1"><Menu className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">{title}</h1>
          {subtitle && <div className="text-xs text-slate-500 truncate">{subtitle}</div>}
        </div>

        <div className="hidden md:flex items-center relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("search") + "..."}
            className="input !pl-11 w-64 py-2 text-sm"
          />
        </div>

        <select
          className="hidden sm:block bg-transparent text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 outline-none"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {["GBP", "USD", "EUR", "AUD", "CAD"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="bg-transparent text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-md px-1 sm:px-2 py-1.5 outline-none max-w-[100px]"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {langs.map((l) => (
            <option key={l} value={l}>{languageLabels[l]}</option>
          ))}
        </select>

        <button
          onClick={toggleTheme}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex-shrink-0"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-1 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0">
              {(user?.name || "U").charAt(0)}
            </div>
            <ChevronDown className="w-3 h-3 hidden sm:block text-slate-500" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="dropdown z-50 mt-1 right-0">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{user?.name}</div>
                  <div className="text-xs text-slate-500">{user?.email}</div>
                </div>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                  <LogOut className="w-4 h-4" /> {t("sign_out")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function StatCard({ label, value, delta, icon: Icon, accent = "indigo" }:
  { label: string; value: string; delta?: string; icon: any; accent?: "indigo" | "emerald" | "amber" | "rose" | "sky" }) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-500 to-purple-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
    sky: "from-sky-500 to-cyan-600",
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{value}</div>
          {delta && <div className="text-xs text-emerald-600 mt-1">{delta}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} text-white flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export function PageCard({ title, subtitle, actions, children, className = "" }:
  { title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>}
            {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-3 sm:p-5">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "green" | "yellow" | "red" | "blue" | "gray" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useApp();
  const map: Record<string, { labelEn: string; labelZhCN: string; labelZhTW: string; tone: "green" | "yellow" | "red" | "blue" | "gray" }> = {
    active: { labelEn: "Active", labelZhCN: "正常", labelZhTW: "正常", tone: "green" },
    in_stock: { labelEn: "In stock", labelZhCN: "有库存", labelZhTW: "有庫存", tone: "green" },
    out_of_stock: { labelEn: "Out of stock", labelZhCN: "缺货", labelZhTW: "缺貨", tone: "red" },
    disabled: { labelEn: "Disabled", labelZhCN: "已禁用", labelZhTW: "已禁用", tone: "gray" },
    pending_payment: { labelEn: "Pending Payment", labelZhCN: "待付款", labelZhTW: "待付款", tone: "amber" as any },
    processing: { labelEn: "Processing", labelZhCN: "处理中", labelZhTW: "處理中", tone: "blue" },
    pending_qrcode: { labelEn: "Pending QR Code", labelZhCN: "待上传二维码", labelZhTW: "待上傳二維碼", tone: "orange" as any },
    pending_delivery: { labelEn: "Pending Delivery", labelZhCN: "待投递", labelZhTW: "待投遞", tone: "amber" as any },
    pending_tracking: { labelEn: "Pending Tracking", labelZhCN: "待填写运单号", labelZhTW: "待填寫運單號", tone: "cyan" as any },
    pending: { labelEn: "Unshipped", labelZhCN: "未发货", labelZhTW: "未發貨", tone: "yellow" },
    shipped: { labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨", tone: "purple" as any },
    completed: { labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成", tone: "green" },
    cancelled: { labelEn: "Cancelled", labelZhCN: "已取消", labelZhTW: "已取消", tone: "red" },
    A: { labelEn: "Level A", labelZhCN: "A级", labelZhTW: "A級", tone: "green" },
    B: { labelEn: "Level B", labelZhCN: "B级", labelZhTW: "B級", tone: "blue" },
    C: { labelEn: "Level C", labelZhCN: "C级", labelZhTW: "C級", tone: "gray" },
  };
  const v = map[status] || { labelEn: status, labelZhCN: status, labelZhTW: status, tone: "gray" as any };
  const label = lang === "zh-CN" ? v.labelZhCN : lang === "zh-TW" ? v.labelZhTW : v.labelEn;
  return <Badge tone={v.tone as any}>{label}</Badge>;
}
