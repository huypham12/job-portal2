-- AlterTable
ALTER TABLE "connection_interests" ADD COLUMN IF NOT EXISTS "suggested_job_ids" JSONB;

-- DropEnum (chỉ xóa nếu không được sử dụng)
DO $$
BEGIN
  -- Kiểm tra và xóa payment_status nếu không được sử dụng
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'payment_status'
    AND NOT EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE atttypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    )
  ) THEN
    DROP TYPE "payment_status";
  END IF;

  -- Kiểm tra và xóa report_target_type nếu không được sử dụng
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'report_target_type'
    AND NOT EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE atttypid = (SELECT oid FROM pg_type WHERE typname = 'report_target_type')
    )
  ) THEN
    DROP TYPE "report_target_type";
  END IF;

  -- Kiểm tra và xóa subscription_status nếu không được sử dụng
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_status'
    AND NOT EXISTS (
      SELECT 1 FROM pg_attribute
      WHERE atttypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_status')
    )
  ) THEN
    DROP TYPE "subscription_status";
  END IF;
END $$;

