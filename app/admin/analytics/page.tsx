"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard, StatCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { orders, agents, products, monthlyRevenue } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Bar as ChartBar,
  BarChart as ChartBarChart,
  CartesianGrid as ChartCartesianGrid,
  Cell as ChartCell,
  Line as ChartLine,
  LineChart as ChartLineChart,
  Pie as ChartPie,
  PieChart as ChartPieChart,
  ResponsiveContainer as ChartResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis as ChartXAxis,
  YAxis as ChartYAxis,
  Legend as ChartLegend,
} from "recharts";
import { TrendingUp, Users, Package, BarChart2 } from "lucide-react";

const COLORS = ["#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899"];

export default function AnalyticsPage() {
  const { t, currency, lang } = useApp();
  const topProducts = [...products].sort((a, b) => b.stock * b.wholesalePrice - a.stock * b.wholesalePrice).slice(0, 6);
  const topAgents = agents.slice(0, 5);

  const categoryBreakdown = Array.from(new Set(products.map((p) => p.category))).map((cat) => ({
    name: cat,
    value: products.filter((p) => p.category === cat).reduce((s, p) => s + p.stock * p.wholesalePrice, 0),
  }));

  return (
    <AdminLayout title={t("analytics")} subtitle={lang === "en" ? "Business insights" : lang === "zh-CN" ? "商业洞察" : "商業洞察"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("revenue")} value={formatCurrency(orders.reduce((s, o) => s + o.total, 0), currency)} delta="+18%" icon={TrendingUp} accent="indigo" />
        <StatCard label={t("agents")} value={formatNumber(agents.length)} icon={Users} accent="emerald" />
        <StatCard label={t("products")} value={formatNumber(products.length)} icon={Package} accent="amber" />
        <StatCard label={t("orders")} value={formatNumber(orders.length)} icon={BarChart2} accent="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4">{lang === "en" ? "Revenue trend" : lang === "zh-CN" ? "收入趋势" : "收入趨勢"}</h2>
          <div className="h-72">
            <ChartResponsiveContainer>
              <ChartLineChart data={monthlyRevenue}>
                <ChartCartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <ChartXAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <ChartYAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <ChartLine type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
              </ChartLineChart>
            </ChartResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold mb-4">{lang === "en" ? "Inventory by category" : lang === "zh-CN" ? "按分类统计" : "按分類統計"}</h2>
          <div className="h-72">
            <ChartResponsiveContainer>
              <ChartPieChart>
                <ChartPie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={3}>
                  {categoryBreakdown.map((_, idx) => <ChartCell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </ChartPie>
                <ChartTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <ChartLegend />
              </ChartPieChart>
            </ChartResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PageCard title={lang === "en" ? "Top products by value" : lang === "zh-CN" ? "高价值产品" : "高價值產品"}>
          <div className="space-y-3">
            {topProducts.map((p) => {
              const value = p.stock * p.wholesalePrice;
              const max = Math.max(...topProducts.map((x) => x.stock * x.wholesalePrice));
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-sm font-semibold">{formatCurrency(value, currency)}</div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${(value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </PageCard>

        <PageCard title={lang === "en" ? "Top agents" : lang === "zh-CN" ? "顶级代理商" : "頂級代理商"}>
          <div className="space-y-3">
            {topAgents.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.company}</div>
                  <div className="text-xs text-slate-500">{a.country}</div>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(a.outstanding + a.creditLimit, currency)}</div>
              </div>
            ))}
          </div>
        </PageCard>
      </div>
    </AdminLayout>
  );
}
