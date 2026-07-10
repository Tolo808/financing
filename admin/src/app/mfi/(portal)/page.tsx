import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMfiUser } from "@/server/auth/current-mfi-user";
import { getPortfolioSummary, getLoanList, type LoanStatus } from "@/server/services/lender-portfolio-service";

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

export default async function MfiDashboardPage() {
  const mfiUser = await getCurrentMfiUser();
  if (!mfiUser) redirect("/mfi/login");

  const [summary, loans] = await Promise.all([
    getPortfolioSummary(mfiUser.lenderId),
    getLoanList(mfiUser.lenderId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Portfolio Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Updated in real time as daily earnings are recorded for each financed driver.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Loans" value={summary.loanCount.toString()} />
        <StatCard label="Disbursed" value={`${Number(summary.totalDisbursedBirr).toLocaleString()} Birr`} />
        <StatCard label="Collected" value={`${Number(summary.totalCollectedBirr).toLocaleString()} Birr`} />
        <StatCard label="Outstanding" value={`${Number(summary.totalOutstandingBirr).toLocaleString()} Birr`} />
        <StatCard label="Portfolio at Risk" value={`${summary.portfolioAtRiskPercent}%`} />
      </div>

      <div className="flex gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
          {summary.countByStatus.CURRENT} current
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 font-medium text-red-700">
          {summary.countByStatus.IN_ARREARS} in arrears
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">
          {summary.countByStatus.CLEARED} cleared
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Driver</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Progress</th>
              <th className="px-5 py-3">Paid / Total</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.driverId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3.5 font-medium text-slate-900">
                  <Link href={`/mfi/loans/${loan.driverId}`} className="hover:text-royal-700">
                    {loan.name}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{loan.phone}</td>
                <td className="px-5 py-3.5">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-royal-600"
                      style={{ width: `${loan.summary.percentPaid}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600">
                  {Number(loan.summary.paidSoFarBirr).toLocaleString()} /{" "}
                  {Number(loan.summary.totalObligationBirr).toLocaleString()} Birr
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[loan.status]}`}
                  >
                    {STATUS_LABELS[loan.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/mfi/loans/${loan.driverId}`}
                    className="text-sm font-medium text-royal-700 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {loans.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  No financed drivers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
