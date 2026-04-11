const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating Analytics tables...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyticsSnapshot" (
          "id" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL,
          "totalUsers" INTEGER NOT NULL DEFAULT 0,
          "newUsers" INTEGER NOT NULL DEFAULT 0,
          "returningUsers" INTEGER NOT NULL DEFAULT 0,
          "activeUsers" INTEGER NOT NULL DEFAULT 0,
          "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
          "avgCoursesPerStudent" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "hourlyActivity" TEXT,
          "topCourses" TEXT,
          "courseDistribution" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_key" ON "AnalyticsSnapshot"("date");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyticsCourseDaily" (
          "id" TEXT NOT NULL,
          "date" TIMESTAMP(3) NOT NULL,
          "courseId" TEXT NOT NULL,
          "courseName" TEXT NOT NULL,
          "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
          "totalEnrollments" INTEGER NOT NULL DEFAULT 0,
          "growthDelta" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "AnalyticsCourseDaily_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsCourseDaily_date_courseId_key" ON "AnalyticsCourseDaily"("date", "courseId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AnalyticsCourseDaily_date_idx" ON "AnalyticsCourseDaily"("date");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AnalyticsCourseDaily_courseId_idx" ON "AnalyticsCourseDaily"("courseId");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AnalyticsConfig" (
          "id" TEXT NOT NULL DEFAULT 'singleton',
          "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "cronIntervalHours" INTEGER NOT NULL DEFAULT 24,

          CONSTRAINT "AnalyticsConfig_pkey" PRIMARY KEY ("id")
      );
    `);

    console.log('✅ Analytics tables created successfully.');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
