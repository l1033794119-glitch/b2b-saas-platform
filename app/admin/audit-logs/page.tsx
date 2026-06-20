"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { auditLogs } from "@/lib/mockData";

export default function AuditLogsPage() {
  const { t, lang } = useApp();
  return (
    <AdminLayout title={t("audit_logs")} subtitle={lang === "en" ? "System activity" : lang === "zh-CN" ? "系统活动" : "系統活動"}>
      <PageCard>
        <div className="scrollable">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("time")}</th>
                <th>{t("user")}</th>
                <th>{t("action")}</th>
                <th>{t("ip_address")}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((a) => (
                <tr key={a.id}>
                  <td className="text-sm text-slate-500">{a.time}</td>
                  <td className="font-medium">{a.user}</td>
                  <td>{a.action}</td>
                  <td className="font-mono text-xs">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </AdminLayout>
  );
}
