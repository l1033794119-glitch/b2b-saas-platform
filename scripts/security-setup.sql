-- ============================================================
--  B2B 平台安全加固 SQL 脚本
--  部署新版代码前，在 MySQL 数据库中执行以下命令
-- ============================================================

-- ------------------------------------------------------------
--  1. 创建 sessions 表（必须，鉴权和 CSRF 依赖此表）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(120) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id, user_type),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  2. 创建 kvs 表（必须，登录失败计数/限流/CSRF 依赖此表）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kvs (
  k VARCHAR(255) PRIMARY KEY,
  v TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
--  3. 清理过期 session（可选，手动清理一次）
-- ------------------------------------------------------------
DELETE FROM sessions WHERE expires_at < NOW();

-- ------------------------------------------------------------
--  4. 数据库安全加固（重要，防止外部直连）
-- ------------------------------------------------------------
-- 步骤 A：检查是否有允许远程连接的用户（有 '%' host 的用户）
-- SELECT user, host FROM mysql.user WHERE host = '%';

-- 步骤 B：删除所有非 localhost 的 root/匿名用户（危险操作，请仔细确认后执行）
-- DELETE FROM mysql.user WHERE host NOT IN ('localhost', '127.0.0.1', '::1');
-- FLUSH PRIVILEGES;

-- 步骤 C：为应用账号 b2buser 限制只允许 localhost（宝塔默认就是 localhost，可跳过）
-- RENAME USER 'b2buser'@'%' TO 'b2buser'@'localhost';
-- FLUSH PRIVILEGES;

-- 步骤 D：为 b2buser 设置强密码（用你自己的强密码替换）
-- ALTER USER 'b2buser'@'localhost' IDENTIFIED BY '你自己的强密码，至少 16 位含大小写数字特殊字符';
-- FLUSH PRIVILEGES;

-- 步骤 E：检查当前数据库用户与 host
-- SELECT user, host FROM mysql.user WHERE user NOT IN ('mysql.sys', 'mysql.session');
