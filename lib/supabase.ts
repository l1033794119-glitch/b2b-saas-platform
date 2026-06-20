import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase 客户端单例（懒加载）
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  // 优先使用服务角色密钥（服务端 API 权限更高）
  const key = supabaseServiceRole || supabaseAnonKey;

  if (!supabaseUrl || !key) {
    // 如果没有配置，返回一个"虚拟"客户端，但真实请求会被拦截
    // 我们通过 isSupabaseConfigured 来检查是否真的可以调用
    console.warn(
      "⚠️  Supabase 环境变量未配置 - 将使用内存存储作为后备方案"
    );
    // 创建一个空客户端（实际不会被使用）
    supabaseInstance = createClient("https://placeholder.supabase.co", "placeholder", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return supabaseInstance;
  }

  supabaseInstance = createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}

// 导出默认客户端实例
export const supabase = getSupabaseClient();

// 检查 Supabase 是否真的配置了
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return !!url && !!key && url !== "https://placeholder.supabase.co";
}
