import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { updateDriverSchema } from "@/lib/validation";
import { getDriver, updateDriver } from "@/server/services/driver-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const driver = await getDriver(id);
  if (!driver) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ driver });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateDriverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const driver = await updateDriver(id, parsed.data, admin.id);
  return NextResponse.json({ driver });
}
