-- Migration: Add order cancellation feature
-- Date: 2026-07-27

-- Add cancellation columns to orders table
ALTER TABLE orders ADD COLUMN cancel_reason TEXT NULL;
ALTER TABLE orders ADD COLUMN previous_status VARCHAR(50) NULL;
ALTER TABLE orders ADD COLUMN cancel_requested_at DATETIME NULL;
ALTER TABLE orders ADD COLUMN cancelled_at DATETIME NULL;
ALTER TABLE orders ADD COLUMN cancelled_by VARCHAR(100) NULL;

-- Update existing cancelled orders if any
UPDATE orders SET cancelled_at = date WHERE status = 'cancelled' AND cancelled_at IS NULL;
