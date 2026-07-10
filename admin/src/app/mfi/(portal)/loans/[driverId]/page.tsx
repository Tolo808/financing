import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMfiUser } from "@/server/auth/current-mfi-user";
import { getLoanDetail, type LoanStatus } from "@/server/services/lender-portfolio-service";

const STATUS_STYLES: Record<LoanStatus, string> = {
  CURRENT: "bg-emerald-50 text-emerald-700",
  IN_ARREARS: "bg-red-50 text-red-700",
  CLEARED: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS: Record<LoanStatus, string> = {
  CURRENT: "Current",
  IN_ARREARS: "In arrears",
  CLEARED: "Cleared",
};

export default async function MfiLoanDetailPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const mfiUser = await getCurrentMfiUser();
  if (!mfiUser) redirect("/mfi/login");

  const { driverId } = await params;

  let loan;
  try {
    loan = await getLoanDetail(mfiUser.lenderId, driverId);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/mfi" className="text-sm font-medium text-slate-500 hover:text-royal-700">
          ← Portfolio
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{loan.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[loan.status]}`}
          >
            {STATUS_LABELS[loan.status]}
          </span>
          {!loan.active && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              Inactive driver
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {loan.phone} · {loan.termMonths}-month term · {loan.cadence.toLowerCase()} installments
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Loan Progress</div>
          <div className="text-sm font-semibold text-royal-700">{loan.summary.percentPaid.toFixed(0)}% paid</div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-royal-600" style={{ width: `${loan.summary.percentPaid}%` }} />
        </div>
        <div className="mt-3 flex justify-between text-sm text-slate-600">
          <span>{Number(loan.summary.paidSoFarBirr).toLocaleString()} Birr paid</span>
          <span>{Number(loan.summary.remainingBirr).toLocaleString()} Birr remaining</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {loan.summary.monthsPaid} of {loan.summary.termMonths} months paid ·{" "}
          {loan.summary.monthsRemaining} remaining · Total obligation:{" "}
          {Number(loan.summary.totalObligationBirr).toLocaleString()} Birr
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Payment History</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Installment Due</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Arrears In</th>
                <th className="px-5 py-3">Arrears Out</th>
              </tr>
            </thead>
            <tbody>
              {loan.ledger.map((entry) => (
                <tr key={entry.periodIndex} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{entry.periodIndex}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {entry.periodStart.toISOString().slice(0, 10)} - {entry.periodEnd.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-5 py-3 text-slate-900">{entry.saccoPaymentDue.toString()}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{entry.saccoPaymentPaid.toString()}</td>
                  <td className="px-5 py-3 text-slate-600">{entry.arrearsCarriedIn.toString()}</td>
                  <td className="px-5 py-3 text-slate-600">{entry.arrearsCarriedOut.toString()}</td>
                </tr>
              ))}
              {loan.ledger.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                    No settlements recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
