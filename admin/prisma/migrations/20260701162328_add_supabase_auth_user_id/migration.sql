-- Nullable for now: existing rows have no Supabase Auth user yet. Populated during the
-- Phase B cutover (admin/driver accounts get created in Supabase Auth and linked back here).
ALTER TABLE "admin_users" ADD COLUMN "authUserId" TEXT;
ALTER TABLE "drivers" ADD COLUMN "authUserId" TEXT;

CREATE UNIQUE INDEX "admin_users_authUserId_key" ON "admin_users"("authUserId");
CREATE UNIQUE INDEX "drivers_authUserId_key" ON "drivers"("authUserId");
