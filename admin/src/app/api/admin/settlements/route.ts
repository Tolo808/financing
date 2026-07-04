import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { recordSettlementSchema } from "@/lib/validation";
import { recordOrCorrectSettlement } from "@/server/services/settlement-service";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = recordSettlementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const ledger = await recordOrCorrectSettlement(parsed.data, admin.id);
  return NextResponse.json({ ledger }, { status: 201 });
}
