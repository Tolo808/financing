import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { updateGlobalSettingsSchema } from "@/lib/validation";
import { db } from "@/server/db";
import { writeAuditLog } from "@/server/services/audit-service";

export async function GET() {
  const settings = await db.globalSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateGlobalSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const before = await db.globalSettings.findUnique({ where: { id: "singleton" } });
  const after = await db.globalSettings.update({
    where: { id: "singleton" },
    data: { ...parsed.data, updatedByAdminId: admin.id },
  });

  await writeAuditLog(db, {
    entityType: "GlobalSettings",
    entityId: "singleton",
    action: "UPDATE",
    beforeJson: before,
    afterJson: after,
    actorType: "ADMIN",
    actorAdminId: admin.id,
  });

  return NextResponse.json({ settings: after });
}
