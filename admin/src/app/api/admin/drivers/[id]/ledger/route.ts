import { NextRequest, NextResponse } from "next/server";
import { getDriverLedger } from "@/server/services/settlement-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includeSuperseded = request.nextUrl.searchParams.get("includeSuperseded") === "true";
  const ledger = await getDriverLedger(id, includeSuperseded);
  return NextResponse.json({ ledger });
}
