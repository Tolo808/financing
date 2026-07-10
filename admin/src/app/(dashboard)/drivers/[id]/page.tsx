import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client-runtime-utils";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { getDriver, updateDriver } from "@/server/services/driver-service";
import { listLenders } from "@/server/services/lender-service";
import {
  getDriverLedger,
  recordOrCorrectSettlement,
  deleteLatestSettlement,
} from "@/server/services/settlement-service";
import { getEffectiveConfig, getGlobalSettings } from "@/server/services/effective-config";
import { computeMfiSummaryFromValues } from "@/server/services/mfi-summary";
import { updateDriverSchema, recordSettlementSchema } from "@/lib/validation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

async function updateDriverAction(id: string, formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");

  const raw: Record<string, unknown> = { active: formData.get("active") === "on" };

  const saccoMonthlyPayment = formData.get("saccoMonthlyPayment");
  if (saccoMonthlyPayment) raw.saccoMonthlyPayment = Number(saccoMonthlyPayment);

  const termMonths = formData.get("termMonths");
  if (termMonths) raw.termMonths = Number(termMonths);

  const toloTargetBirrOverride = formData.get("toloTargetBirrOverride");
  raw.toloTargetBirrOverride = toloTargetBirrOverride ? Number(toloTargetBirrOverride) : null;

  const toloRatePercentOverride = formData.get("toloRatePercentOverride");
  raw.toloRatePercentOverride = toloRatePercentOverride ? Number(toloRatePercentOverride) : null;

  const pin = formData.get("pin");
  if (pin) raw.pin = String(pin);

  const lenderId = formData.get("lenderId");
  if (lenderId) raw.lenderId = String(lenderId);

  const parsed = updateDriverSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid driver input");

  await updateDriver(id, parsed.data, admin.id);
  revalidatePath(`/drivers/${id}`);
}

async function recordSettlementAction(driverId: string, formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");

  const parsed = recordSettlementSchema.safeParse({
    driverId,
    periodIndex: Number(formData.get("periodIndex")),
    periodStart: new Date(String(formData.get("periodStart"))).toISOString(),
    periodEnd: new Date(String(formData.get("periodEnd"))).toISOString(),
    earnings: Number(formData.get("earnings")),
  });
  if (!parsed.success) throw new Error("Invalid settlement input");

  await recordOrCorrectSettlement(parsed.data, admin.id);
  revalidatePath(`/drivers/${driverId}`);
  redirect(`/drivers/${driverId}`);
}

async function deleteLatestSettlementAction(driverId: string) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");

  await deleteLatestSettlement(driverId, admin.id);
  revalidatePath(`/drivers/${driverId}`);
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function DriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [driver, ledger, settings, lenders] = await Promise.all([
    getDriver(id),
    getDriverLedger(id, false),
    getGlobalSettings(),
    listLenders(),
  ]);
  if (!driver) notFound();
  const latestPeriodIndex = ledger.length > 0 ? Math.max(...ledger.map((s) => s.periodIndex)) : 0;
  const nextPeriodIndex = latestPeriodIndex + 1;

  const editPeriodIndex = sp.edit ? Number(sp.edit) : undefined;
  const editingEntry = editPeriodIndex ? ledger.find((s) => s.periodIndex === editPeriodIndex) : undefined;

  const config = getEffectiveConfig(driver, settings);
  // ledger already holds every ACTIVE settlement for this driver, so the total paid-so-far can
  // be summed here instead of computeMfiSummary's usual separate aggregate query.
  const paidSoFar = ledger.reduce((sum, s) => sum.plus(s.saccoPaymentPaid), new Decimal(0));
  const mfi = computeMfiSummaryFromValues(driver, config, paidSoFar);

  const latest = ledger.at(-1);
  const toloTarget = Number(config.toloTargetBirr);
  const toloRecovered = latest ? Number(latest.cumulativeToloRecoveredAfter) : 0;
  const toloPercent = toloTarget > 0 ? Math.min(100, (toloRecovered / toloTarget) * 100) : 100;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/drivers" className="text-sm font-medium text-slate-500 hover:text-royal-700">
            ← Drivers
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{driver.name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                driver.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {driver.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {driver.phone} · {driver.termMonths}-month term
          </p>
        </div>
        <a
          href={`/api/admin/drivers/${id}/ledger/export`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Tolo Recovery Progress
            </div>
            <div className="text-sm font-semibold text-royal-700">{toloPercent.toFixed(0)}%</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-royal-600" style={{ width: `${toloPercent}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm text-slate-600">
            <span>{toloRecovered.toLocaleString()} Birr recovered</span>
            <span>{toloTarget.toLocaleString()} Birr target</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              MFI Remaining Payment
            </div>
            <div className="text-sm font-semibold text-royal-700">{mfi.percentPaid.toFixed(0)}% paid</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-royal-600" style={{ width: `${mfi.percentPaid}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-sm text-slate-600">
            <span>{Number(mfi.paidSoFarBirr).toLocaleString()} Birr paid</span>
            <span>{Number(mfi.remainingBirr).toLocaleString()} Birr remaining</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Total obligation: {driver.termMonths} mo × {Number(config.saccoFixedInstallment).toLocaleString()}{" "}
            Birr = {Number(mfi.totalObligationBirr).toLocaleString()} Birr
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Driver Settings</h2>
          <form action={updateDriverAction.bind(null, id)} className="space-y-4">
            <div>
              <label className={labelClass}>Monthly SACCo Payment (Birr)</label>
              <input
                name="saccoMonthlyPayment"
                type="number"
                defaultValue={(Number(driver.saccoFinancedTotal) / driver.termMonths).toString()}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Term (months)</label>
              <input name="termMonths" type="number" defaultValue={driver.termMonths} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tolo target override (Birr, blank = use global default)</label>
              <input
                name="toloTargetBirrOverride"
                type="number"
                defaultValue={driver.toloTargetBirrOverride?.toString() ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tolo rate % override (blank = use global default)</label>
              <input
                name="toloRatePercentOverride"
                type="number"
                step="0.01"
                defaultValue={driver.toloRatePercentOverride?.toString() ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Lender (SACCo/MFI)</label>
              <select name="lenderId" defaultValue={driver.lenderId} className={inputClass}>
                {lenders.map((lender) => (
                  <option key={lender.id} value={lender.id}>
                    {lender.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Reset PIN (blank = keep current)</label>
              <input name="pin" minLength={4} maxLength={12} className={inputClass} />
            </div>
            <div className="flex items-center gap-2">
              <input id="active" name="active" type="checkbox" defaultChecked={driver.active} className="h-4 w-4 rounded border-slate-300 text-royal-700" />
              <label htmlFor="active" className="text-sm text-slate-700">
                Active
              </label>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-royal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
            >
              Save
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {editingEntry ? `Edit Period ${editingEntry.periodIndex}` : "Record / Correct Settlement"}
            </h2>
            {editingEntry && (
              <Link href={`/drivers/${id}`} className="text-sm font-medium text-slate-500 hover:text-royal-700">
                Cancel
              </Link>
            )}
          </div>
          <form action={recordSettlementAction.bind(null, id)} className="space-y-4">
            <div>
              <label className={labelClass}>
                Period # (existing number corrects it, new number records a new period)
              </label>
              <input
                name="periodIndex"
                type="number"
                required
                min={1}
                defaultValue={editingEntry?.periodIndex ?? nextPeriodIndex}
                readOnly={Boolean(editingEntry)}
                className={`${inputClass} ${editingEntry ? "bg-slate-50 text-slate-500" : ""}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Period start</label>
                <input
                  name="periodStart"
                  type="date"
                  required
                  defaultValue={editingEntry?.periodStart.toISOString().slice(0, 10)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Period end</label>
                <input
                  name="periodEnd"
                  type="date"
                  required
                  defaultValue={editingEntry?.periodEnd.toISOString().slice(0, 10)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Total delivery earnings (Birr)</label>
              <input
                name="earnings"
                type="number"
                required
                min={0}
                step="0.01"
                defaultValue={editingEntry?.earnings.toString()}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-royal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
            >
              {editingEntry ? "Save correction" : "Post settlement"}
            </button>
          </form>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Ledger</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Period</th>
                <th className="px-5 py-3">Earnings</th>
                <th className="px-5 py-3">Tolo Cut</th>
                <th className="px-5 py-3">SACCo Paid</th>
                <th className="px-5 py-3">Arrears Out</th>
                <th className="px-5 py-3">Take Home</th>
                <th className="px-5 py-3">Tolo Recovered</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {ledger.map((s) => {
                const isLatest = s.periodIndex === latestPeriodIndex;
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">{s.periodIndex}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {s.periodStart.toISOString().slice(0, 10)} - {s.periodEnd.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-5 py-3 text-slate-900">{s.earnings.toString()}</td>
                    <td className="px-5 py-3 text-slate-900">{s.toloCut.toString()}</td>
                    <td className="px-5 py-3 text-slate-900">{s.saccoPaymentPaid.toString()}</td>
                    <td className="px-5 py-3 text-slate-900">{s.arrearsCarriedOut.toString()}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{s.takeHome.toString()}</td>
                    <td className="px-5 py-3 text-slate-600">{s.cumulativeToloRecoveredAfter.toString()}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/drivers/${id}?edit=${s.periodIndex}`}
                          className="text-sm font-medium text-royal-700 hover:underline"
                        >
                          Edit
                        </Link>
                        {isLatest && (
                          <form action={deleteLatestSettlementAction.bind(null, id)}>
                            <ConfirmSubmitButton
                              confirmMessage={`Delete period ${s.periodIndex}? This cannot be undone from the UI — the row is kept for audit but will no longer count toward this driver's totals.`}
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {ledger.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-400" colSpan={9}>
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
