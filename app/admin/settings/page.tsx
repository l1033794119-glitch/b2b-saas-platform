"use client";

import { AdminLayout } from "@/components/Layout";
import { PageCard } from "@/components/Sidebar";
import { useApp } from "@/components/AppProvider";
import { Globe, DollarSign, Building } from "lucide-react";
import { useState } from "react";

export default function AdminSettingsPage() {
  const { t, lang, currency, setLang, setCurrency } = useApp();
  const langs: Array<"en" | "zh-CN" | "zh-TW"> = ["en", "zh-CN", "zh-TW"];
  const currencies = ["GBP", "USD", "EUR", "AUD", "CAD"];
  const labels: Record<string, string> = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文" };
  const [company, setCompany] = useState({ name: "Acme Trading Co.", phone: "+1 555 0123", email: "hello@acme.com", tax: "20" });

  return (
    <AdminLayout title={t("system_settings")} subtitle={lang === "en" ? "Configure platform" : lang === "zh-CN" ? "配置系统" : "配置系統"}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <PageCard title={t("company_information")}>
          <div className="space-y-3">
            <div><label className="label">{lang === "en" ? "Company Name" : lang === "zh-CN" ? "公司名称" : "公司名稱"}</label><input className="input" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
            <div><label className="label">{t("phone")}</label><input className="input" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></div>
            <div><label className="label">{t("email")}</label><input className="input" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
            <div><label className="label">{t("tax_rate")} (%)</label><input className="input" value={company.tax} onChange={(e) => setCompany({ ...company, tax: e.target.value })} /></div>
            <div className="pt-3"><button className="btn-primary">{t("save")}</button></div>
          </div>
        </PageCard>

        <PageCard title={t("website_settings")}>
          <div className="space-y-6">
            <div>
              <div className="text-sm font-semibold mb-3 flex items-center gap-2"><Globe className="w-4 h-4" /> {t("language")}</div>
              <div className="grid grid-cols-3 gap-2">
                {langs.map((l) => (
                  <button key={l} onClick={() => setLang(l)} className={`p-3 rounded-xl border text-sm ${lang === l ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold" : "border-slate-200 dark:border-slate-800"}`}>
                    {labels[l]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t("currency")}</div>
              <div className="grid grid-cols-5 gap-2">
                {currencies.map((c) => (
                  <button key={c} onClick={() => setCurrency(c)} className={`p-3 rounded-xl border text-sm ${currency === c ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold" : "border-slate-200 dark:border-slate-800"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PageCard>
      </div>

      <PageCard title={t("logo")}>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold flex items-center justify-center">AC</div>
          <div>
            <button className="btn-primary">{lang === "en" ? "Upload logo" : lang === "zh-CN" ? "上传 logo" : "上載 logo"}</button>
            <div className="text-xs text-slate-500 mt-2">PNG, SVG · 512×512 max</div>
          </div>
        </div>
      </PageCard>
    </AdminLayout>
  );
}
