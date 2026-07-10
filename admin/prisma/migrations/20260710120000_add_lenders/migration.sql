-- CreateTable
CREATE TABLE "lenders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfi_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authUserId" TEXT,
    "name" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mfi_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mfi_users_email_key" ON "mfi_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mfi_users_authUserId_key" ON "mfi_users"("authUserId");

-- AddForeignKey
ALTER TABLE "mfi_users" ADD CONSTRAINT "mfi_users_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed one placeholder lender so existing driver/settlement rows have somewhere to backfill to.
-- Rename it (or create the real lender and reassign drivers) via the new /lenders admin page.
INSERT INTO "lenders" ("id", "name", "createdAt") VALUES ('default-lender', 'Unassigned - please rename', CURRENT_TIMESTAMP);

-- Add drivers.lenderId nullable first (safe for existing rows), backfill, then enforce NOT NULL.
ALTER TABLE "drivers" ADD COLUMN "lenderId" TEXT;
UPDATE "drivers" SET "lenderId" = 'default-lender' WHERE "lenderId" IS NULL;
ALTER TABLE "drivers" ALTER COLUMN "lenderId" SET NOT NULL;
CREATE INDEX "drivers_lenderId_idx" ON "drivers"("lenderId");
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Same nullable -> backfill-from-driver -> NOT NULL sequence for settlements.lenderId (snapshot).
ALTER TABLE "settlements" ADD COLUMN "lenderId" TEXT;
UPDATE "settlements" s SET "lenderId" = d."lenderId" FROM "drivers" d WHERE d.id = s."driverId";
ALTER TABLE "settlements" ALTER COLUMN "lenderId" SET NOT NULL;
CREATE INDEX "settlements_lenderId_idx" ON "settlements"("lenderId");
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
