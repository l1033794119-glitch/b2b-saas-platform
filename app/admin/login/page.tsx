"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Lang } from "@/lib/i18n";
import { useApp, languageLabels } from "@/components/AppProvider";
import { Globe, Lock, Shield } from "lucide-react";

export default function AdminLogin() {
  const { t, lang, setLang, login, user } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/admin/dashboard");
    }
  }, [user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await login(email, password, true);
    setLoading(false);
    if (!ok) {
      setError(lang === "en" ? "Invalid admin credentials" : lang === "zh-CN" ? "管理员凭据无效" : "管理員憑證無效");
      return;
    }
    router.push("/admin/dashboard");
  };

  const langs: Lang[] = ["en", "zh-CN", "zh-TW"];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-semibold">
          <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <span>{t("administrator_portal")}</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4">
            {lang === "en" ? "Admin console for operations, finance and warehouse teams" : lang === "zh-CN" ? "运营、财务与仓库团队的管理控制台" : "營運、財務與倉庫團隊的管理控制台"}
          </h1>
          <p className="text-lg text-white/70 max-w-lg">
            {lang === "en"
              ? "Monitor inventory, process orders and manage your agent network from a single professional dashboard."
              : lang === "zh-CN"
              ? "从一个专业仪表盘监控库存、处理订单并管理您的代理商网络。"
              : "從一個專業儀表板監控庫存、處理訂單並管理您的代理商網絡。"}
          </p>
          <div className="mt-10 space-y-3 max-w-md">
            {[
              "2FA & IP logging",
              "Role-based access control",
              "Full audit trail",
              "Multi-language & multi-currency",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-white/80">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-white/50">© 2025 B2B Platform. All rights reserved.</div>
      </div>

      <div className="flex flex-col bg-white dark:bg-[#0b0f19]">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-slate-200 dark:border-slate-800">
          <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            ← {t("back_to_login")}
          </Link>
          <div className="relative flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <select
              className="bg-transparent text-sm border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 outline-none"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              {langs.map((l) => (
                <option key={l} value={l}>{languageLabels[l]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("welcome_back_admin")}</h1>
            <p className="text-slate-500 mb-8">{t("sign_in_to_admin")}</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">{t("email")}</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">{t("password")}</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 border border-red-200 dark:border-red-900">{error}</div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center py-2.5 text-base">
                {loading ? "..." : t("sign_in")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
