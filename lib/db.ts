import { createPool, Pool, ResultSetHeader } from "mysql2/promise";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("⚠️  DATABASE_URL 未配置 - 将使用内存存储作为后备方案");
    pool = createPool({
      host: "localhost",
      port: 3306,
      user: "placeholder",
      password: "placeholder",
      database: "placeholder",
      connectionLimit: 0,
    });
    return pool;
  }

  const url = new URL(connectionString);
  const dbConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  };

  pool = createPool(dbConfig);

  return pool;
}

export const db = getPool();

export async function isDatabaseConfigured(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  try {
    const pool = getPool();
    const [rows] = await pool.query("SELECT 1");
    return Array.isArray(rows) && rows.length > 0;
  } catch (e: any) {
    console.warn("⚠️  MySQL 连接测试失败:", e?.message || String(e));
    return false;
  }
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.query(text, params);
  return rows as T[];
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const pool = getPool();
  const [result] = await pool.query(text, params);
  const header = result as ResultSetHeader;
  return header.affectedRows || 0;
}