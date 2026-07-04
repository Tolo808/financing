-- Row Level Security policies for the Tolo Supabase project.
--
-- Run this once via the Supabase SQL editor (Project -> SQL Editor -> New query) AFTER
-- `prisma migrate deploy` has created the tables. Not run automatically by Prisma migrations
-- on purpose — Prisma doesn't track RLS policies and will fight with them if they're mixed
-- into the normal migration diffing flow.
--
-- Design: drivers get SELECT on their own driver row, their own settlements, and their own
-- notifications (plus UPDATE on notifications, scoped to marking their own as read). There is
-- deliberately NO insert/update/delete policy on drivers or settlements for the `authenticated`
-- role — financial writes (recording/correcting settlements) only ever happen through the
-- admin's Next.js backend, which connects as the table-owning Postgres role and bypasses RLS
-- entirely (standard Postgres/Supabase behavior for the owning role / service_role).

ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- A driver can read their own driver row (dashboard profile: name, language, term, cadence).
CREATE POLICY "drivers_select_own" ON "drivers"
  FOR SELECT
  USING (auth.uid() = "authUserId"::uuid);

-- A driver can read their own settlement history.
CREATE POLICY "settlements_select_own" ON "settlements"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "drivers"
      WHERE "drivers".id = "settlements"."driverId"
        AND "drivers"."authUserId"::uuid = auth.uid()
    )
  );

-- A driver can read their own notifications.
CREATE POLICY "notifications_select_own" ON "notifications"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "drivers"
      WHERE "drivers".id = "notifications"."driverId"
        AND "drivers"."authUserId"::uuid = auth.uid()
    )
  );

-- A driver can mark their own notifications read (the app only ever sets `readAt`, but RLS
-- is row-level, not column-level — application code is what keeps the update scoped to that
-- one field).
CREATE POLICY "notifications_update_own" ON "notifications"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "drivers"
      WHERE "drivers".id = "notifications"."driverId"
        AND "drivers"."authUserId"::uuid = auth.uid()
    )
  );
