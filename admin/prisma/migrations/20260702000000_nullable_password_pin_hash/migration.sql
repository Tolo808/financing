-- Auth is moving to Supabase Auth (authUserId); these columns are no longer written to by the
-- application. Kept (not dropped) for now rather than risking data loss during the cutover.
ALTER TABLE "admin_users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "drivers" ALTER COLUMN "pinHash" DROP NOT NULL;
