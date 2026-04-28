-- Idempotent schema sync for course store / upgrade tables.
-- This replaces the deploy-time emergency_schema_sync.js hook with a normal migration.

ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "liveUpgradePrice" DOUBLE PRECISION;

ALTER TABLE "TopicSharedContent" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "UpgradeTransaction" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "razorpayOrderId" TEXT NOT NULL,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "userId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UpgradeTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UpgradeTransaction_orderId_key" ON "UpgradeTransaction"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "UpgradeTransaction_razorpayOrderId_key" ON "UpgradeTransaction"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "UpgradeTransaction_userId_idx" ON "UpgradeTransaction"("userId");
CREATE INDEX IF NOT EXISTS "UpgradeTransaction_classId_idx" ON "UpgradeTransaction"("classId");
CREATE INDEX IF NOT EXISTS "UpgradeTransaction_status_idx" ON "UpgradeTransaction"("status");
CREATE INDEX IF NOT EXISTS "UpgradeTransaction_createdAt_idx" ON "UpgradeTransaction"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UpgradeTransaction_userId_fkey') THEN
    ALTER TABLE "UpgradeTransaction" ADD CONSTRAINT "UpgradeTransaction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UpgradeTransaction_classId_fkey') THEN
    ALTER TABLE "UpgradeTransaction" ADD CONSTRAINT "UpgradeTransaction_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CourseOffering" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "thumbnail" TEXT,
  "hasRecorded" BOOLEAN NOT NULL DEFAULT true,
  "recordedOriginalPrice" DOUBLE PRECISION,
  "recordedDiscountPrice" DOUBLE PRECISION,
  "hasLive" BOOLEAN NOT NULL DEFAULT false,
  "liveOriginalPrice" DOUBLE PRECISION,
  "liveDiscountPrice" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CourseOffering_classId_idx" ON "CourseOffering"("classId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CourseOffering_classId_fkey') THEN
    ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "isExternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isExternal" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Order_userId_fkey') THEN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "courseOfferingId" TEXT,
  "classId" TEXT NOT NULL,
  "accessType" TEXT NOT NULL DEFAULT 'RECORDED',
  "price" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_classId_idx" ON "OrderItem"("classId");
CREATE INDEX IF NOT EXISTS "OrderItem_courseOfferingId_idx" ON "OrderItem"("courseOfferingId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_orderId_fkey') THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_classId_fkey') THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_courseOfferingId_fkey') THEN
    ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_courseOfferingId_fkey"
      FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WebhookLog" (
  "id" TEXT NOT NULL,
  "webhookEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WebhookLog" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "WebhookLog" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookLog_webhookEventId_key" ON "WebhookLog"("webhookEventId");
CREATE INDEX IF NOT EXISTS "WebhookLog_webhookEventId_idx" ON "WebhookLog"("webhookEventId");
CREATE INDEX IF NOT EXISTS "WebhookLog_eventType_idx" ON "WebhookLog"("eventType");
CREATE INDEX IF NOT EXISTS "WebhookLog_status_idx" ON "WebhookLog"("status");
CREATE INDEX IF NOT EXISTS "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");
