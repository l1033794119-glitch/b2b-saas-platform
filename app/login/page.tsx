"use client";

import Link from "next/link";
import { Lang } from "@/lib/i18n";
import { useApp, languageLabels } from "@/components/AppProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export default function AgentLogin() {
  const { t, lang, setLang, login } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await login(email, password, false);
    setLoading(false);
    if (!ok) {
      setError(lang === "en" ? "Invalid email or password" : lang === "zh-CN" ? "邮箱或密码错误" : "電子郵件或密碼錯誤");
      return;
    }
    router.push("/agent/dashboard");
  };

  const langs: Lang[] = ["en", "zh-CN", "zh-TW"];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white p-12">
        <div className="flex items-center gap-3 text-xl font-semibold tracking-tight">
          <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center font-bold">B2B</div>
          <span>B2B Platform</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            {lang === "en" ? "Streamline your wholesale business" : lang === "zh-CN" ? "简化您的批发业务" : "簡化您的批發業務"}
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            {lang === "en"
              ? "Professional inventory, warehouse and agent ordering platform — designed for modern wholesale teams."
              : lang === "zh-CN"
              ? "专业的库存、仓库与代理商订购平台 — 专为现代批发团队打造。"
              : "專業的庫存、倉庫與代理商訂購平台 — 專為現代批發團隊打造。"}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { v: "500+", l: lang === "en" ? "Products" : lang === "zh-CN" ? "产品" : "產品" },
              { v: "120+", l: lang === "en" ? "Agents" : lang === "zh-CN" ? "代理商" : "代理商" },
              { v: "24/7", l: lang === "en" ? "Support" : lang === "zh-CN" ? "支持" : "支援" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl font-bold">{s.v}</div>
                <div className="text-sm text-white/75 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm text-white/60">© 2025 B2B Platform. All rights reserved.</div>
      </div>

      <div className="flex flex-col bg-white dark:bg-[#0b0f19]">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-slate-200 dark:border-slate-800">
          <Link href="/admin/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {t("administrator_portal")}
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
            <h1 className="text-3xl font-bold mb-2">{t("welcome_back")}</h1>
            <p className="text-slate-500 mb-8">{t("sign_in_to_agent")}</p>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">{t("email")}</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">{t("password")}</label>
                  <a className="text-sm text-indigo-600 hover:underline" href="#">{t("forgot_password")}</a>
                </div>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2 border border-red-200 dark:border-red-900">{error}</div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center py-2.5 text-base">
                {loading ? "..." : t("sign_in")}
              </button>
            </form>

            <div className="mt-6 text-sm text-center text-slate-500">
              {lang === "en" ? "Don't have an account?" : lang === "zh-CN" ? "还没有账户？" : "還沒有帳戶？"}{" "}
              <a className="text-indigo-600 font-medium hover:underline" href="#">{t("register_agent")}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
