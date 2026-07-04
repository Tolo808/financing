import { NextRequest, NextResponse } from "next/server";
import { getCashCollectionEntriesForDate } from "@/server/services/cash-collection-service";
import { getGlobalSettings } from "@/server/services/effective-config";
import { toCsv } from "@/server/csv";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const [settings, entries] = await Promise.all([getGlobalSettings(), getCashCollectionEntriesForDate(date)]);
  const priceTiers = settings.priceTiers as unknown as number[];
  const rows = entries.map((entry) => {
    const counts = entry.tierCounts as unknown as Record<string, number>;
    const tierColumns = Object.fromEntries(priceTiers.map((p) => [String(p), counts[String(p)] ?? 0]));
    return {
      date: entry.date.toISOString().slice(0, 10),
      driver: entry.driver.name,
      phone: entry.driver.phone,
      ...tierColumns,
      total: entry.totalBirr.toString(),
      collected: entry.collectedBirr.toString(),
      uncollected: entry.uncollectedBirr.toString(),
      status: entry.depositStatus,
    };
  });

  const columns = [
    "date",
    "driver",
    "phone",
    ...priceTiers.map(String),
    "total",
    "collected",
    "uncollected",
    "status",
  ];
  const csv = toCsv(rows, columns);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="cash-collection-${date}.csv"`,
    },
  });
}
