"use client";

import Link from "next/link";
import { Lang } from "@/lib/i18n";
import { useApp, languageLabels } from "@/components/AppProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, ShoppingBag } from "lucide-react";

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative overflow-hidden">
      {/* 背景光晕 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px]" />
      </div>

      {/* 左侧展示区 */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden z-10 bg-black">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-green-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-semibold text-white">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
              boxShadow: "0 4px 16px rgba(52, 199, 89, 0.4)",
            }}
          >
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span>B2B Platform</span>
        </div>
        <div className="relative text-white">
          <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">
            {lang === "en" ? "Streamline your wholesale business" : lang === "zh-CN" ? "简化您的批发业务" : "簡化您的批發業務"}
          </h1>
          <p className="text-lg text-white/70 max-w-lg">
            {lang === "en"
              ? "Professional inventory, warehouse and agent ordering platform — designed for modern wholesale teams."
              : lang === "zh-CN"
              ? "专业的库存、仓库与代理商订购平台 — 专为现代批发团队打造。"
              : "專業的庫存、倉庫與代理商訂購平台 — 專為現代批發團隊打造。"}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[
              { v: "500+", l: lang === "en" ? "Products" : lang === "zh-CN" ? "产品" : "產品" },
              { v: "120+", l: lang === "en" ? "Agents" : lang === "zh-CN" ? "代理商" : "代理商" },
              { v: "24/7", l: lang === "en" ? "Support" : lang === "zh-CN" ? "支持" : "支援" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl font-bold text-white">{s.v}</div>
                <div className="text-sm text-white/60 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-white/50">© 2025 B2B Platform. All rights reserved.</div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex flex-col relative z-10">
        <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
          <Link href="/admin/login" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: "#34c759" }}>
            {t("administrator_portal")}
          </Link>
          <div className="relative flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <select
              className="bg-transparent text-sm rounded-xl px-2.5 py-1.5 outline-none cursor-pointer input-glass"
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
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-2xl text-white flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #34c759 0%, #30d158 100%)",
                  boxShadow: "0 4px 16px rgba(52, 199, 89, 0.3)",
                }}
              >
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">{t("welcome_back")}</h1>
            <p className="text-slate-500 mb-8">{t("sign_in_to_agent")}</p>

            <form onSubmit={onSubmit} className="space-y-5">
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
                  <a className="text-sm hover:opacity-80" style={{ color: "#34c759" }} href="#">{t("forgot_password")}</a>
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
                <div
                  className="text-sm rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(255, 59, 48, 0.1)",
                    color: "#ff3b30",
                    border: "1px solid rgba(255, 59, 48, 0.2)",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center flex items-center py-3 text-base font-medium"
              >
                {loading ? "..." : t("sign_in")}
              </button>
            </form>

            <div className="mt-6 text-sm text-center text-slate-500">
              {lang === "en" ? "Don't have an account?" : lang === "zh-CN" ? "还没有账户？" : "還沒有帳戶？"}{" "}
              <a className="font-medium hover:opacity-80" style={{ color: "#34c759" }} href="#">{t("register_agent")}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
