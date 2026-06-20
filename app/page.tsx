"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Package, Users, TrendingUp, Warehouse, Shield, Globe, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const { user, lang } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const texts = {
    agentLogin: lang === "en" ? "Agent login" : lang === "zh-CN" ? "代理商登录" : "代理商登入",
    agentPortal: lang === "en" ? "Agent portal" : lang === "zh-CN" ? "代理商门户" : "代理商入口",
    adminConsole: lang === "en" ? "Admin console" : lang === "zh-CN" ? "管理控制台" : "管理控制台",
    signIn: lang === "en" ? "Sign in" : lang === "zh-CN" ? "登录" : "登入",
    adminLogin: lang === "en" ? "Admin login" : lang === "zh-CN" ? "管理员登录" : "管理員登入",
    badge: lang === "en" ? "Inventory · Warehouse · Agent ordering" : lang === "zh-CN" ? "库存 · 仓库 · 代理商订购" : "庫存 · 倉庫 · 代理商訂購",
    heroTitle1: lang === "en" ? "The modern way to run your" : lang === "zh-CN" ? "现代化运营您的" : "現代化運營您的",
    heroTitle2: lang === "en" ? "B2B wholesale" : lang === "zh-CN" ? "B2B批发业务" : "B2B批發業務",
    heroDesc: lang === "en"
      ? "Inventory management, warehouse operations, multi-level agent pricing, order processing and finance reporting — in one professional SaaS platform."
      : lang === "zh-CN"
      ? "库存管理、仓库运营、多级代理商定价、订单处理与财务报表 — 一站式专业SaaS平台。"
      : "庫存管理、倉庫運營、多級代理商定價、訂單處理與財務報表 — 一站式專業SaaS平台。",
    features: [
      { icon: Package, title: lang === "en" ? "Product management" : lang === "zh-CN" ? "产品管理" : "產品管理", desc: lang === "en" ? "Multi-language SKU catalog with images, categories, tiered pricing and inventory control." : lang === "zh-CN" ? "多语言SKU目录，支持图片、分类、分级定价与库存控制。" : "多語言SKU目錄，支援圖片、分類、分級定價與庫存控制。" },
      { icon: Warehouse, title: lang === "en" ? "Warehouses & stock" : lang === "zh-CN" ? "仓库与库存" : "倉庫與庫存", desc: lang === "en" ? "Multi-warehouse operations, stock-in / stock-out, transfers, pick lists and low-stock alerts." : lang === "zh-CN" ? "多仓库运营、入库出库、调拨、拣货单与低库存预警。" : "多倉庫運營、入庫出庫、調撥、拣貨單與低庫存預警。" },
      { icon: Users, title: lang === "en" ? "Agents & pricing" : lang === "zh-CN" ? "代理商与定价" : "代理商與定價", desc: lang === "en" ? "Multi-level agent pricing (A/B/C) with individual pricing overrides and credit limits." : lang === "zh-CN" ? "多级代理商定价（A/B/C），支持单独定价覆盖与信用额度管理。" : "多級代理商定價（A/B/C），支援單獨定價覆蓋與信用額度管理。" },
      { icon: TrendingUp, title: lang === "en" ? "Orders & finance" : lang === "zh-CN" ? "订单与财务" : "訂單與財務", desc: lang === "en" ? "Full order lifecycle, shipment tracking, profit analytics and export-ready finance reports." : lang === "zh-CN" ? "完整订单生命周期、发货追踪、利润分析与可导出财务报表。" : "完整訂單生命週期、發貨追蹤、利潤分析與可導出財務報表。" },
      { icon: Shield, title: lang === "en" ? "Role-based access" : lang === "zh-CN" ? "角色权限" : "角色權限", desc: lang === "en" ? "Super admin, warehouse, finance, operations and customer service roles with granular permissions." : lang === "zh-CN" ? "超级管理员、仓库、财务、运营与客服角色，细粒度权限控制。" : "超級管理員、倉庫、財務、營運與客服角色，細粒度權限控制。" },
      { icon: Globe, title: lang === "en" ? "Multi-language" : lang === "zh-CN" ? "多语言支持" : "多語言支援", desc: lang === "en" ? "English, Simplified Chinese and Traditional Chinese — with multi-currency support." : lang === "zh-CN" ? "英文、简体中文与繁体中文 — 支持多币种。" : "英文、簡體中文與繁體中文 — 支援多幣種。" },
    ],
    footer: lang === "en" ? `© ${new Date().getFullYear()} B2B Platform. Built with Next.js, Tailwind CSS, Supabase.` : lang === "zh-CN" ? `© ${new Date().getFullYear()} B2B平台。基于 Next.js、Tailwind CSS、Supabase 构建。` : `© ${new Date().getFullYear()} B2B平台。基於 Next.js、Tailwind CSS、Supabase 构建。`,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-white">
      <nav className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm">B</div>
            <span>{lang === "en" ? "B2B Platform" : lang === "zh-CN" ? "B2B平台" : "B2B平台"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost text-sm">{mounted && user?.role === "agent" ? texts.agentPortal : texts.agentLogin}</Link>
            <Link href="/admin/login" className="btn-primary text-sm flex items-center gap-1.5"><Shield className="w-4 h-4" /> {texts.adminConsole}</Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> {texts.badge}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-5">
          {texts.heroTitle1} <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">{texts.heroTitle2}</span>
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          {texts.heroDesc}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/login" className="btn-primary text-base px-6 py-3 flex items-center gap-2">
            {texts.signIn} <ChevronRight className="w-4 h-4" />
          </Link>
          <Link href="/admin/login" className="btn-ghost text-base px-6 py-3">{texts.adminLogin}</Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {texts.features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900/40">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <div className="font-semibold text-lg mb-1">{f.title}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500">
        {texts.footer}
      </footer>
    </div>
  );
}