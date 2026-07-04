-- Enforce at most one ACTIVE settlement per (driverId, periodIndex).
-- Prisma's schema-level @@unique can't express partial uniqueness, so this is raw SQL.
CREATE UNIQUE INDEX "settlements_active_driver_period_unique"
  ON "settlements" ("driverId", "periodIndex")
  WHERE "status" = 'ACTIVE';
