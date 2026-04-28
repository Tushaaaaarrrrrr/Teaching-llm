const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Creating new tables if they do not exist...')

  try {
    // 1. Create CourseOffering
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CourseOffering_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    console.log('CourseOffering table created or exists.')

    // Add indexes manually if needed
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CourseOffering_classId_idx" ON "CourseOffering"("classId");`)

    // 2. Create Order
    await prisma.$executeRawUnsafe(`
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
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    console.log('Order table created or exists.')
    
    // Attempt to add unique constraint on razorpayOrderId if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");`);
    } catch (e) {
      // Index might already exist, ignore
    }
    
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");`)

    // 3. Create OrderItem
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "courseOfferingId" TEXT,
        "classId" TEXT NOT NULL,
        "accessType" TEXT NOT NULL DEFAULT 'RECORDED',
        "price" DOUBLE PRECISION NOT NULL,
        CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "OrderItem_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "OrderItem_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `)
    console.log('OrderItem table created or exists.')

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrderItem_classId_idx" ON "OrderItem"("classId");`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OrderItem_courseOfferingId_idx" ON "OrderItem"("courseOfferingId");`)

    console.log('Migration successful!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
