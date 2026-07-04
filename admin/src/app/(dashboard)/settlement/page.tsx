import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { getGlobalSettings } from "@/server/services/effective-config";
import { listDrivers } from "@/server/services/driver-service";
import { recordCashCollection, getCashCollectionEntriesForDate } from "@/server/services/cash-collection-service";
import { recordCashCollectionSchema } from "@/lib/validation";
import { SettlementDateFilter } from "@/components/settlement-date-filter";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getPriceTiers(): Promise<number[]> {
  const settings = await getGlobalSettings();
  return settings.priceTiers as unknown as number[];
}

async function addRowAction(formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");

  const date = String(formData.get("date"));
  const driverId = String(formData.get("driverId"));
  const collectedBirrRaw = String(formData.get("collectedBirr") ?? "");
  const depositStatus = String(formData.get("depositStatus"));
  const priceTiers = await getPriceTiers();

  const tierCounts: Record<string, number> = {};
  for (const price of priceTiers) {
    tierCounts[String(price)] = Number(formData.get(`tier_${price}`) || 0);
  }

  // On any failure below, re-open the form with exactly what the admin typed rather than
  // losing it — a validation crash that wipes several tier counts they just entered is
  // exactly the kind of thing that makes a data-entry page painful to use.
  const retryParams = () => {
    const params = new URLSearchParams({ date, driverId, collectedBirr: collectedBirrRaw, depositStatus });
    for (const price of priceTiers) {
      params.set(`tier_${price}`, String(tierCounts[String(price)] ?? 0));
    }
    return params;
  };

  const parsed = recordCashCollectionSchema.safeParse({
    driverId,
    date,
    tierCounts,
    collectedBirr: Number(collectedBirrRaw),
    depositStatus,
  });
  if (!parsed.success) {
    const params = retryParams();
    params.set("error", "Please select a driver and check the entered values.");
    redirect(`/settlement?${params.toString()}`);
  }

  let errorMessage: string | null = null;
  try {
    await recordCashCollection(parsed.data, admin.id);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Failed to save this entry.";
  }

  if (errorMessage) {
    const params = retryParams();
    params.set("error", errorMessage);
    redirect(`/settlement?${params.toString()}`);
  }

  revalidatePath("/settlement");
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const date = sp.date || todayDateString();
  const editId = sp.edit;
  const errorMessage = sp.error;

  const [entries, drivers, priceTiers] = await Promise.all([
    getCashCollectionEntriesForDate(date),
    listDrivers(),
    getPriceTiers(),
  ]);
  const activeDrivers = drivers.filter((d) => d.active);
  const editingEntry = editId ? entries.find((e) => e.id === editId) : undefined;

  // Retry values (from a failed submission) take priority over an edit-prefill, since they
  // represent the admin's most recent, not-yet-saved input.
  const isRetry = errorMessage !== undefined;
  const formDriverId = isRetry ? (sp.driverId ?? "") : (editingEntry?.driverId ?? "");
  const formCollectedBirr = isRetry ? (sp.collectedBirr ?? "") : (editingEntry?.collectedBirr.toString() ?? "");
  const formDepositStatus = isRetry ? (sp.depositStatus ?? "PENDING") : (editingEntry?.depositStatus ?? "PENDING");
  const formTierCounts: Record<string, number> = isRetry
    ? Object.fromEntries(priceTiers.map((p) => [String(p), Number(sp[`tier_${p}`] ?? 0)]))
    : ((editingEntry?.tierCounts as unknown as Record<string, number>) ?? {});
  const formOpen = isRetry || !!editingEntry;
  const formHeading = editingEntry && !isRetry ? `Edit entry — ${editingEntry.driver.name}` : "+ Add Row";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settlement</h1>
        <p className="mt-1 text-sm text-slate-500">Cash Collection — Daily driver settlement tracking</p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Cash Collection</div>
            <div className="text-xs text-slate-500">Daily driver settlement tracking</div>
          </div>
          <div className="flex items-center gap-3">
            <SettlementDateFilter date={date} />
            <a
              href={`/api/admin/settlement/export?date=${date}`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              ⬇ Export
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Phone</th>
                {priceTiers.map((price) => (
                  <th key={price} className="px-4 py-3">
                    {price}
                  </th>
                ))}
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Uncollected</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const counts = entry.tierCounts as unknown as Record<string, number>;
                return (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.date.toISOString().slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{entry.driver.name}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.driver.phone}</td>
                    {priceTiers.map((price) => (
                      <td key={price} className="px-4 py-3 text-slate-600">
                        {counts[String(price)] ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-slate-900">{Number(entry.totalBirr).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900">{Number(entry.collectedBirr).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900">{Number(entry.uncollectedBirr).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          entry.depositStatus === "DEPOSITED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {entry.depositStatus === "DEPOSITED" ? "Deposited" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/settlement?date=${date}&edit=${entry.id}`}
                        className="text-sm font-medium text-royal-700 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={5 + priceTiers.length + 5}>
                    No entries for this date. Click &quot;+ Add Row&quot; to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm" open={formOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
          <span>{formHeading}</span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-100 px-6 py-6">
          <form action={addRowAction} className="grid max-w-3xl grid-cols-2 gap-x-4 gap-y-4">
            <input type="hidden" name="date" value={date} />
            <div className="col-span-2">
              <label className={labelClass}>Driver</label>
              <select name="driverId" required defaultValue={formDriverId} className={inputClass}>
                <option value="" disabled>
                  Select a driver
                </option>
                {activeDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.phone})
                  </option>
                ))}
              </select>
            </div>
            {priceTiers.map((price) => (
              <div key={price}>
                <label className={labelClass}>{price} Birr orders</label>
                <input
                  name={`tier_${price}`}
                  type="number"
                  min={0}
                  defaultValue={formTierCounts[String(price)] ?? 0}
                  className={inputClass}
                />
              </div>
            ))}
            <div>
              <label className={labelClass}>Collected (Birr)</label>
              <input
                name="collectedBirr"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={formCollectedBirr}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="depositStatus" className={inputClass} defaultValue={formDepositStatus}>
                <option value="PENDING">Pending</option>
                <option value="DEPOSITED">Deposited</option>
              </select>
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-royal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
              >
                {editingEntry && !isRetry ? "Save changes" : "Save entry"}
              </button>
            </div>
          </form>
        </div>
      </details>
    </div>
  );
}
