import { NextRequest, NextResponse } from "next/server";
import { getDriverLedger } from "@/server/services/settlement-service";
import { toCsv } from "@/server/csv";

const COLUMNS = [
  "periodIndex",
  "periodStart",
  "periodEnd",
  "earnings",
  "toloRatePercentApplied",
  "toloCut",
  "saccoFixedInstallment",
  "saccoPaymentDue",
  "saccoPaymentPaid",
  "arrearsCarriedIn",
  "arrearsCarriedOut",
  "cumulativeToloRecoveredBefore",
  "cumulativeToloRecoveredAfter",
  "takeHome",
  "status",
  "createdAt",
];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ledger = await getDriverLedger(id, false);

  const rows = ledger.map((s) => ({
    ...s,
    periodStart: s.periodStart.toISOString(),
    periodEnd: s.periodEnd.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, COLUMNS);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="driver-${id}-ledger.csv"`,
    },
  });
}
