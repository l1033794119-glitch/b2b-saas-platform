-- ============================================================
-- 为已有数据库添加 qr_code 列
-- 如果你已经创建了 orders 表，请运行此脚本
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- 验证：
SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qr_code';
