"use client";

import { AgentLayout } from "@/components/Layout";
import { useApp } from "@/components/AppProvider";
import { Globe, DollarSign } from "lucide-react";
import { useState } from "react";

export default function AgentSettingsPage() {
  const { t, user, lang, setLang, currency, setCurrency } = useApp();
  const langs: Array<"en" | "zh-CN" | "zh-TW"> = ["en", "zh-CN", "zh-TW"];
  const currencies = ["GBP", "USD", "EUR", "AUD", "CAD"];
  const labels: Record<string, string> = { en: "English", "zh-CN": "简体中文", "zh-TW": "繁體中文" };

  return (
    <AgentLayout title={t("profile")} subtitle={user?.email}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><Globe className="w-4 h-4" /> {t("language")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {langs.map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`p-4 rounded-xl border text-sm ${lang === l ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold" : "border-slate-200 dark:border-slate-800"}`}>
                {labels[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> {t("currency")}</h2>
          <div className="grid grid-cols-5 gap-2">
            {currencies.map((c) => (
              <button key={c} onClick={() => setCurrency(c)} className={`p-3 rounded-xl border text-sm ${currency === c ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold" : "border-slate-200 dark:border-slate-800"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold mb-4">{t("account_info")}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t("email")}</span><span className="font-medium">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t("agent_level")}</span><span className="font-medium">{user?.level}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{lang === "en" ? "Company" : lang === "zh-CN" ? "公司" : "公司"}</span><span className="font-medium">{user?.company || "—"}</span></div>
          </div>
        </div>
      </div>
    </AgentLayout>
  );
}
