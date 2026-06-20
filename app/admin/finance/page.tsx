"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard, StatCard, StatusBadge } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { orders, agents } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, TrendingUp, Users, FileText, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function FinancePage() {
  const { t, currency, lang } = useApp();
  const revenue = orders.reduce((s, o) => (o.status === "completed" || o.status === "shipped" || o.status === "processing" ? s + o.total : s), 0);
  const profit = Math.round(revenue * 0.42);
  const receivable = agents.reduce((s, a) => s + a.outstanding, 0);
  const monthlyRev = [
    { month: "Jan", revenue: 82000, profit: 34000 },
    { month: "Feb", revenue: 95000, profit: 39500 },
    { month: "Mar", revenue: 112000, profit: 47200 },
    { month: "Apr", revenue: 98000, profit: 40500 },
    { month: "May", revenue: 128000, profit: 53000 },
    { month: "Jun", revenue: 142000, profit: 59600 },
  ];

  const byAgent = agents
    .map((a) => ({ name: a.company.slice(0, 14), outstanding: a.outstanding }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  const COLORS = ["#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444"];

  return (
    <AdminLayout title={t("finance")} subtitle={lang === "en" ? "Revenue, profit & accounts receivable" : lang === "zh-CN" ? "收入、利润与应收款" : "收入、利潤與應收款"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("revenue")} value={formatCurrency(revenue, currency)} delta="+18%" icon={DollarSign} accent="indigo" />
        <StatCard label={t("profit")} value={formatCurrency(profit, currency)} delta="+22%" icon={TrendingUp} accent="emerald" />
        <StatCard label={t("accounts_receivable")} value={formatCurrency(receivable, currency)} icon={Users} accent="amber" />
        <StatCard label={t("agent_debt")} value={formatCurrency(receivable, currency)} icon={FileText} accent="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 card p-5">
          <h2 className="text-base font-semibold mb-4">{lang === "en" ? "Monthly revenue & profit" : lang === "zh-CN" ? "月度收入与利润" : "月度收入與利潤"}</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthlyRev} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="profit" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4">{lang === "en" ? "Debt by agent" : lang === "zh-CN" ? "各代理商欠款" : "各代理商欠款"}</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byAgent} dataKey="outstanding" nameKey="name" outerRadius={90} innerRadius={55} paddingAngle={3}>
                  {byAgent.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <PageCard
        title={lang === "en" ? "Outstanding balances" : lang === "zh-CN" ? "未结余额明细" : "未結餘額明細"}
        actions={<button className="btn-ghost flex items-center gap-2"><Download className="w-4 h-4" /> {t("export")} {t("excel")}</button>}
      >
        <div className="scrollable">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("agent_role")}</th>
                <th>{lang === "en" ? "Contact" : lang === "zh-CN" ? "联系人" : "聯絡人"}</th>
                <th>{t("credit_limit")}</th>
                <th>{t("outstanding_balance")}</th>
                <th>{lang === "en" ? "Status" : lang === "zh-CN" ? "状态" : "狀態"}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.company}</td>
                  <td>{a.contact}</td>
                  <td>{formatCurrency(a.creditLimit, currency)}</td>
                  <td className="font-semibold text-amber-600">{formatCurrency(a.outstanding, currency)}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </AdminLayout>
  );
}
