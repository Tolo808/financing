import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { createDriverSchema } from "@/lib/validation";
import { createDriver, listDrivers } from "@/server/services/driver-service";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const drivers = await listDrivers(search);
  return NextResponse.json({ drivers });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDriverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const driver = await createDriver(parsed.data, admin.id);
  return NextResponse.json({ driver }, { status: 201 });
}
