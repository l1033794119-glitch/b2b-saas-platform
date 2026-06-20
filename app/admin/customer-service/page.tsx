"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { orders, agents } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { Mail, MessageCircle, Headphones } from "lucide-react";

export default function CustomerServicePage() {
  const { lang } = useApp();
  return (
    <AdminLayout title={lang === "en" ? "Customer Service" : lang === "zh-CN" ? "客服中心" : "客服中心"} subtitle={lang === "en" ? "Tickets & agent support" : lang === "zh-CN" ? "工单与代理商支持" : "工單與代理商支援"}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 card p-5">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Headphones className="w-4 h-4" /> {lang === "en" ? "Recent tickets" : lang === "zh-CN" ? "最近工单" : "最近工單"}</h2>
          <div className="space-y-3">
            {[
              { id: "t-1201", from: "John Smith", subject: "Payment upload issue", status: "pending", time: "10m" },
              { id: "t-1200", from: "Jane Doe", subject: "Tracking number missing", status: "active", time: "1h" },
              { id: "t-1199", from: "Michael Lee", subject: "Discount request for bulk order", status: "active", time: "3h" },
              { id: "t-1198", from: "Anna Müller", subject: "Invoice copy", status: "completed", time: "5h" },
              { id: "t-1197", from: "David Chen", subject: "Login problem", status: "completed", time: "Yesterday" },
            ].map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold">{t.from.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold truncate">{t.subject}</div>
                    <StatusBadge status={t.status as any} />
                  </div>
                  <div className="text-xs text-slate-500">{t.from} · {t.id} · {t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4">{lang === "en" ? "Contacts" : lang === "zh-CN" ? "联系人" : "聯絡人"}</h2>
          <div className="space-y-2">
            {agents.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <MessageCircle className="w-4 h-4 text-indigo-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{a.company}</div>
                  <div className="text-xs text-slate-500 truncate">{a.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageCard title={lang === "en" ? "Agent pending orders" : lang === "zh-CN" ? "待处理订单" : "待處理訂單"}>
        <div className="scrollable">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Agent</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter((o) => o.status === "pending_review" || o.status === "pending_payment").map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs">{o.orderNo}</td>
                  <td className="font-medium">{o.company}</td>
                  <td className="font-medium">{formatCurrency(o.total, "GBP")}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </AdminLayout>
  );
}
