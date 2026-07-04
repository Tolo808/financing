-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'DEPOSITED');

-- AlterTable
ALTER TABLE "global_settings" ADD COLUMN     "priceTiers" JSONB NOT NULL DEFAULT '[150,250,350,450]';

-- CreateTable
CREATE TABLE "cash_collection_entries" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tierCounts" JSONB NOT NULL,
    "totalBirr" DECIMAL(14,2) NOT NULL,
    "collectedBirr" DECIMAL(14,2) NOT NULL,
    "uncollectedBirr" DECIMAL(14,2) NOT NULL,
    "depositStatus" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "settlementId" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_collection_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_collection_entries_settlementId_key" ON "cash_collection_entries"("settlementId");

-- CreateIndex
CREATE INDEX "cash_collection_entries_date_idx" ON "cash_collection_entries"("date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_collection_entries_driverId_date_key" ON "cash_collection_entries"("driverId", "date");

-- AddForeignKey
ALTER TABLE "cash_collection_entries" ADD CONSTRAINT "cash_collection_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_entries" ADD CONSTRAINT "cash_collection_entries_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collection_entries" ADD CONSTRAINT "cash_collection_entries_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
