ALTER TABLE "UpdateSystemSettings"
ADD COLUMN "homeCarouselEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "promoSplashEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promoSplashImage" TEXT,
ADD COLUMN "promoSplashDurationMs" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN "promoSplashTargetPages" TEXT NOT NULL DEFAULT '/dashboard',
ADD COLUMN "promoSplashFrequency" TEXT NOT NULL DEFAULT 'ONCE',
ADD COLUMN "promoSplashIntervalDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "promoSplashVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "HomeSlide"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "PromoSplashView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoSplashView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoSplashView_userId_key" ON "PromoSplashView"("userId");
CREATE INDEX "PromoSplashView_viewedAt_idx" ON "PromoSplashView"("viewedAt");
