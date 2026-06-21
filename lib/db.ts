import { Pool } from "pg";

// PostgreSQL 连接池单例
let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("⚠️  DATABASE_URL 未配置 - 将使用内存存储作为后备方案");
    // 返回一个不会真正连接的池
    pool = new Pool({
      connectionString: "postgresql://localhost:5432/placeholder",
      max: 0, // 不建立任何连接
    });
    return pool;
  }

  pool = new Pool({
    connectionString,
    max: 10, // 最大连接数
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    console.error("❌ PostgreSQL 连接池错误:", err.message);
  });

  return pool;
}

// 导出连接池
export const db = getPool();

// 检查数据库是否可用
export async function isDatabaseConfigured(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  try {
    const pool = getPool();
    const result = await pool.query("SELECT 1");
    return result.rows.length > 0;
  } catch (e: any) {
    console.warn("⚠️  PostgreSQL 连接测试失败:", e?.message || String(e));
    return false;
  }
}

// 执行查询的辅助函数
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// 执行单行查询
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

// 执行插入/更新/删除
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rowCount || 0;
}
