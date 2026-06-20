"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { notifications as initialNotifs } from "@/lib/mockData";
import { Bell, AlertTriangle, DollarSign, Box, CheckCircle } from "lucide-react";

const icons: Record<string, any> = {
  new_order: Box,
  shipment: CheckCircle,
  low_stock: AlertTriangle,
  payment: DollarSign,
  system: Bell,
};

const tones: Record<string, string> = {
  new_order: "badge-blue",
  shipment: "badge-green",
  low_stock: "badge-yellow",
  payment: "badge-red",
  system: "badge-gray",
};

export default function NotificationsPage() {
  const { t, lang } = useApp();
  const [notifs, setNotifs] = useState(initialNotifs);
  const [flt, setFlt] = useState("all");

  const list = notifs.filter((n) => flt === "all" || n.type === flt);

  const markAll = () => setNotifs(notifs.map((n) => ({ ...n, read: true })));

  return (
    <AdminLayout title={t("notifications")} subtitle={lang === "en" ? "Stay informed" : lang === "zh-CN" ? "随时了解" : "隨時了解"}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {[
          { id: "all", label: lang === "en" ? "All" : lang === "zh-CN" ? "全部" : "全部" },
          { id: "new_order", label: t("new_orders") },
          { id: "shipment", label: t("shipment_updates") },
          { id: "low_stock", label: t("low_stock_alerts") },
          { id: "payment", label: t("payment_reminders") },
        ].map((o) => (
          <button key={o.id} onClick={() => setFlt(o.id)} className={`px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 ${flt === o.id ? "bg-indigo-600 text-white border-indigo-600" : ""}`}>
            {o.label}
          </button>
        ))}
        <div className="ml-auto">
          <button onClick={markAll} className="btn-ghost">{lang === "en" ? "Mark all read" : lang === "zh-CN" ? "标记全部已读" : "標記全部已讀"}</button>
        </div>
      </div>

      <PageCard>
        <div className="space-y-3">
          {list.map((n) => {
            const Icon = icons[n.type] || Bell;
            return (
              <div key={n.id} className={`flex gap-3 p-4 rounded-xl border ${n.read ? "border-slate-200 dark:border-slate-800" : "border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900/40"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === "new_order" ? "bg-blue-100 dark:bg-blue-950/40 text-blue-600" : n.type === "shipment" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600" : n.type === "low_stock" ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600" : n.type === "payment" ? "bg-rose-100 dark:bg-rose-950/40 text-rose-600" : "bg-slate-100 dark:bg-slate-900 text-slate-600"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">{n.time}</div>
                  </div>
                  <div className="text-sm text-slate-500">{n.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      </PageCard>
    </AdminLayout>
  );
}
