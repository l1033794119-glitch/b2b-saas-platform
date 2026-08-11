import { createPool, Pool, ResultSetHeader } from "mysql2/promise";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("⚠️  DATABASE_URL 未配置 - 将使用内存存储作为后备方案");
    pool = createPool({
      host: "127.0.0.1", // 强制 IPv4，避免 ::1 (IPv6 localhost) 被拒
      port: 3306,
      user: "placeholder",
      password: "placeholder",
      database: "placeholder",
      connectionLimit: 0,
    });
    return pool;
  }

  const url = new URL(connectionString);
  // 如果 DATABASE_URL 写的是 localhost，强制替换为 127.0.0.1，避免 Node.js 解析为 IPv6 ::1
  const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
  const dbConfig = {
    host: hostname,
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

// 自动建表（sessions / kvs）—— 安全加固依赖的表之前在 SQL 里，部署时常被漏掉导致 401 死循环
let tablesInitialized = false;
let tablesInitializing: Promise<void> | null = null;

async function ensureTables(): Promise<void> {
  if (tablesInitialized) return;
  if (!process.env.DATABASE_URL) return;

  // 正在初始化中，则复用同一个 Promise
  if (tablesInitializing) return tablesInitializing;

  tablesInitializing = (async () => {
    const pool = getPool();
    const createSql = `
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(120) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id, user_type),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
    const createKvs = `
      CREATE TABLE IF NOT EXISTS kvs (
        k VARCHAR(255) PRIMARY KEY,
        v TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;

    // 重试 3 次（首次启动可能 MySQL 尚未就绪）
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await pool.query(createSql);
        await pool.query(createKvs);
        tablesInitialized = true;
        return;
      } catch (e: any) {
        const msg = e?.message || String(e);
        // 如果 error code 1050 (Table already exists) 也算成功
        if (msg.includes("already exists")) {
          tablesInitialized = true;
          return;
        }
        if (attempt >= 2) {
          console.warn("⚠️  自动建表最终失败:", msg);
          return;
        }
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  })();

  return tablesInitializing;
}
// 立即尝试一次
ensureTables().catch(() => {});

export async function isDatabaseConfigured(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  try {
    await ensureTables();
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
  await ensureTables();
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
  await ensureTables();
  const pool = getPool();
  const [result] = await pool.query(text, params);
  const header = result as ResultSetHeader;
  return header.affectedRows || 0;
}