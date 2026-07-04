import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  const entityType = request.nextUrl.searchParams.get("entityType") ?? undefined;
  const entityId = request.nextUrl.searchParams.get("entityId") ?? undefined;
  const take = Number(request.nextUrl.searchParams.get("take") ?? "100");

  const entries = await db.auditLog.findMany({
    where: {
      entityType: entityType || undefined,
      entityId: entityId || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number.isFinite(take) ? take : 100, 500),
    include: { actorAdmin: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ entries });
}
