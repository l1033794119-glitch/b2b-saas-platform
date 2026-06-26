-- Migration: Add waybill_image column and update order status values
-- Date: 2025

-- Add waybill_image column to orders table
ALTER TABLE orders ADD COLUMN waybill_image TEXT NULL;

-- Update existing orders from old statuses to new ones
-- pending_review/pending_approval -> submitted
UPDATE orders SET status = 'submitted' WHERE status IN ('pending_review', 'pending_approval');

-- approved -> pending_qrcode (previously approved orders need QR code)
UPDATE orders SET status = 'pending_qrcode' WHERE status = 'approved';

-- Note: pending_qrcode stays as pending_qrcode
-- Note: pending_shipment stays as pending_shipment
-- Note: shipped stays as shipped
-- Note: completed stays as completed
-- Note: cancelled stays as cancelled
