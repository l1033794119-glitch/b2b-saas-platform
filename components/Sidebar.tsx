"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";
import {
  LayoutDashboard, Package, Warehouse, Users, ShoppingCart, Truck,
  LineChart, Bell, Settings, UsersRound, FileText, Search,
  LogOut, ChevronDown, Menu, X, CreditCard,
} from "lucide-react";
import { useState } from "react";
import { Lang, languageLabels } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { adminMenuItems, getAdminDefaultHref } from "@/lib/admin-menu";

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, user } = useApp();
  const pathname = usePathname();

  const allItems = adminMenuItems.map((it) => ({
    ...it,
    label: it.key === "credit" ? (t("credit_limits") || "Credit Limits") : t(it.key),
  }));

  const items = allItems.filter((it) => {
    if (!user?.permissions) return true;
    return user.permissions[it.key] === true;
  });

  const defaultHref = getAdminDefaultHref(user?.permissions);

  return (
    <>
      {open && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden animate-fadeIn" 
          onClick={onClose}
          style={{ touchAction: "none" }}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-[100dvh] lg:h-screen w-[280px] z-40 flex flex-col transition-transform duration-300 ease-out sidebar-glass ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ willChange: "transform" }}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-black/5">
          <Link href={defaultHref} className="flex items-center gap-2.5 font-semibold">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
                boxShadow: "0 2px 8px rgba(52, 199, 89, 0.3)",
              }}
            >
              B
            </div>
            <span className="text-[15px] tracking-tight">B2B Console</span>
          </Link>
          <button 
            onClick={onClose} 
            className="lg:hidden text-white/80 hover:text-white transition-colors p-2 -mr-2 rounded-xl hover:bg-white/10 active:bg-white/20"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
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
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="text-[14px]">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-black/5">
          <div 
            className="rounded-2xl p-3 transition-all hover:bg-black/[0.03]"
            style={{ background: "rgba(0, 0, 0, 0.02)" }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
                }}
              >
                {(user?.name || "A").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium truncate">{user?.name || "Admin"}</div>
                <div className="text-[12px] text-slate-500 truncate">{user?.email || ""}</div>
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
      {open && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden animate-fadeIn" 
          onClick={onClose}
          style={{ touchAction: "none" }}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-[100dvh] lg:h-screen w-[280px] z-40 flex flex-col transition-transform duration-300 ease-out sidebar-glass ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ willChange: "transform" }}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-black/5">
          <Link href="/agent/dashboard" className="flex items-center gap-2.5 font-semibold">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
                boxShadow: "0 2px 8px rgba(52, 199, 89, 0.3)",
              }}
            >
              A
            </div>
            <span className="text-[15px] tracking-tight">Agent Portal</span>
          </Link>
          <button 
            onClick={onClose} 
            className="lg:hidden text-white/80 hover:text-white transition-colors p-2 -mr-2 rounded-xl hover:bg-white/10 active:bg-white/20"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
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
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="text-[14px] flex-1">{it.label}</span>
                {it.badge && it.badge > 0 ? (
                  <span 
                    className="ml-auto text-[11px] text-white rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-medium"
                    style={{ background: "#34c759" }}
                  >
                    {it.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-black/5">
          <div 
            className="rounded-2xl p-3 transition-all hover:bg-black/[0.03]"
            style={{ background: "rgba(0, 0, 0, 0.02)" }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
                }}
              >
                {(user?.name || "A").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium truncate">{user?.company || user?.name}</div>
                <div className="text-[12px] text-slate-500 truncate">{user?.email || ""}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ title, onMenu, subtitle }: { title: string; onMenu: () => void; subtitle?: string }) {
  const { t, lang, setLang, currency, setCurrency, user, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const langs: Lang[] = ["en", "zh-CN", "zh-TW"];

  return (
    <header 
      className="sticky top-0 z-20 topbar-glass"
    >
      <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3">
        <button 
          onClick={onMenu} 
          className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] sm:text-[19px] font-semibold tracking-tight truncate">{title}</h1>
          {subtitle && (
            <div className="text-[12px] sm:text-[13px] text-slate-500 truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center relative flex-shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("search") + "..."}
            className="input !pl-10 !w-56 !py-2 !text-[13px]"
          />
        </div>

        <select
          className="hidden sm:block text-[12px] sm:text-[13px] rounded-xl px-2.5 py-1.5 outline-none cursor-pointer flex-shrink-0 input-glass"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {["GBP", "USD", "EUR", "AUD", "CAD"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="hidden sm:block text-[13px] rounded-xl px-3 py-1.5 outline-none cursor-pointer flex-shrink-0 input-glass"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {langs.map((l) => (
            <option key={l} value={l}>{languageLabels[l]}</option>
          ))}
        </select>
        
        <select
          className="sm:hidden text-[12px] rounded-xl px-2 py-1.5 outline-none cursor-pointer flex-shrink-0 input-glass"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
        >
          {langs.map((l) => (
            <option key={l} value={l}>
              {l === "en" ? "EN" : l === "zh-CN" ? "简中" : "繁中"}
            </option>
          ))}
        </select>

        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setMenuOpen((v) => !v)} 
            className="flex items-center gap-1.5 sm:gap-2 p-0.5 rounded-xl hover:bg-black/[0.05] transition-colors"
          >
            <div 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full text-white flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
              }}
            >
              {(user?.name || "U").charAt(0)}
            </div>
            <ChevronDown className="w-3.5 h-3.5 hidden sm:block text-slate-500" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setMenuOpen(false)} />
              <div className="dropdown z-50 mt-1 right-0 w-56">
                <div className="px-4 py-3 border-b border-black/5">
                  <div className="text-[14px] font-medium">{user?.name}</div>
                  <div className="text-[12px] text-slate-500 truncate">{user?.email}</div>
                </div>
                <button 
                  onClick={() => { logout(); setMenuOpen(false); }} 
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
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

export function StatCard({ label, value, delta, icon: Icon, accent = "emerald" }:
  { label: string; value: string; delta?: string; icon: any; accent?: "indigo" | "emerald" | "amber" | "rose" | "sky" }) {
  const accents: Record<string, { bg: string; shadow: string }> = {
    indigo: { bg: "linear-gradient(135deg, #34c759 0%, #30d158 100%)", shadow: "0 2px 8px rgba(52, 199, 89, 0.3)" },
    emerald: { bg: "linear-gradient(135deg, #34c759 0%, #30d158 100%)", shadow: "0 2px 8px rgba(52, 199, 89, 0.3)" },
    amber: { bg: "linear-gradient(135deg, #ff9500 0%, #ffb340 100%)", shadow: "0 2px 8px rgba(255, 149, 0, 0.3)" },
    rose: { bg: "linear-gradient(135deg, #ff3b30 0%, #ff6b60 100%)", shadow: "0 2px 8px rgba(255, 59, 48, 0.3)" },
    sky: { bg: "linear-gradient(135deg, #5ac8fa 0%, #64d2ff 100%)", shadow: "0 2px 8px rgba(90, 200, 250, 0.3)" },
  };
  const a = accents[accent] || accents.emerald;
  
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-slate-500 tracking-wide">{label}</div>
          <div className="text-sm sm:text-xl md:text-[28px] font-bold mt-1.5 sm:mt-2 tracking-tight break-words leading-tight">{value}</div>
          {delta && <div className="text-[12px] text-emerald-500 mt-1 font-medium">{delta}</div>}
        </div>
        <div 
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl text-white flex items-center justify-center flex-shrink-0 ml-2 sm:ml-3"
          style={{ background: a.bg, boxShadow: a.shadow }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-black/5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-[16px] sm:text-[17px] font-semibold tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && <div className="text-[12px] sm:text-[13px] text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
          {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "green" | "yellow" | "red" | "blue" | "gray" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const { lang } = useApp();
  const map: Record<string, { labelEn: string; labelZhCN: string; labelZhTW: string; tone: string }> = {
    active: { labelEn: "Active", labelZhCN: "正常", labelZhTW: "正常", tone: "green" },
    in_stock: { labelEn: "In stock", labelZhCN: "有库存", labelZhTW: "有庫存", tone: "green" },
    out_of_stock: { labelEn: "Out of stock", labelZhCN: "缺货", labelZhTW: "缺貨", tone: "red" },
    disabled: { labelEn: "Disabled", labelZhCN: "已禁用", labelZhTW: "已禁用", tone: "gray" },
    pending_payment: { labelEn: "Pending Payment", labelZhCN: "待付款", labelZhTW: "待付款", tone: "amber" },
    processing: { labelEn: "Processing", labelZhCN: "处理中", labelZhTW: "處理中", tone: "blue" },
    pending_qrcode: { labelEn: "Pending QR Code", labelZhCN: "待上传二维码", labelZhTW: "待上傳二維碼", tone: "orange" },
    pending_delivery: { labelEn: "Pending Delivery", labelZhCN: "待投递", labelZhTW: "待投遞", tone: "amber" },
    pending_tracking: { labelEn: "Pending Tracking", labelZhCN: "待填写运单号", labelZhTW: "待填寫運單號", tone: "cyan" },
    pending_cancellation: { labelEn: "Pending Cancellation", labelZhCN: "取消待审核", labelZhTW: "取消待審核", tone: "rose" },
    pending: { labelEn: "Unshipped", labelZhCN: "未发货", labelZhTW: "未發貨", tone: "yellow" },
    shipped: { labelEn: "Shipped", labelZhCN: "已发货", labelZhTW: "已發貨", tone: "purple" },
    completed: { labelEn: "Completed", labelZhCN: "已完成", labelZhTW: "已完成", tone: "green" },
    cancelled: { labelEn: "Cancelled", labelZhCN: "已取消", labelZhTW: "已取消", tone: "red" },
    A: { labelEn: "Level A", labelZhCN: "A级", labelZhTW: "A級", tone: "green" },
    B: { labelEn: "Level B", labelZhCN: "B级", labelZhTW: "B級", tone: "blue" },
    C: { labelEn: "Level C", labelZhCN: "C级", labelZhTW: "C級", tone: "gray" },
  };
  const v = map[status] || { labelEn: status, labelZhCN: status, labelZhTW: status, tone: "gray" };
  const label = lang === "zh-CN" ? v.labelZhCN : lang === "zh-TW" ? v.labelZhTW : v.labelEn;
  return <Badge tone={v.tone as any}>{label}</Badge>;
}
