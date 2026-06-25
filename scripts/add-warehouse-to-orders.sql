-- 为 orders 表添加 warehouse_id 和 warehouse 字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warehouse VARCHAR(255);
