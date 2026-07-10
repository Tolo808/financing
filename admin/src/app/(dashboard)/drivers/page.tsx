import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { listDrivers, createDriver } from "@/server/services/driver-service";
import { listLenders } from "@/server/services/lender-service";
import { createDriverSchema } from "@/lib/validation";

async function createDriverAction(formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");

  const parsed = createDriverSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    pin: formData.get("pin"),
    saccoMonthlyPayment: Number(formData.get("saccoMonthlyPayment")),
    termMonths: Number(formData.get("termMonths")),
    cadence: formData.get("cadence") || "MONTHLY",
    language: formData.get("language") || "en",
    lenderId: formData.get("lenderId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid driver input");
  }

  await createDriver(parsed.data, admin.id);
  revalidatePath("/drivers");
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function DriversPage() {
  const [drivers, lenders] = await Promise.all([listDrivers(), listLenders()]);
  const activeCount = drivers.filter((d) => d.active).length;
  const totalPortfolio = drivers.reduce((sum, d) => sum + Number(d.saccoFinancedTotal), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Drivers</h1>
        <p className="mt-1 text-sm text-slate-500">Manage financed drivers and their SACCo terms.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Drivers" value={drivers.length.toString()} />
        <StatCard label="Active Drivers" value={activeCount.toString()} />
        <StatCard label="SACCo Portfolio" value={`${totalPortfolio.toLocaleString()} Birr`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">SACCo Monthly</th>
              <th className="px-5 py-3">Term</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3.5 font-medium text-slate-900">
                  <Link href={`/drivers/${driver.id}`} className="hover:text-royal-700">
                    {driver.name}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{driver.phone}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  {(Number(driver.saccoFinancedTotal) / driver.termMonths).toLocaleString()} Birr/mo
                </td>
                <td className="px-5 py-3.5 text-slate-600">{driver.termMonths} mo</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      driver.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {driver.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/drivers/${driver.id}`} className="text-sm font-medium text-royal-700 hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  No drivers yet — add your first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
          <span>+ Add Driver</span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-100 px-6 py-6">
          <form action={createDriverAction} className="grid max-w-2xl grid-cols-2 gap-x-4 gap-y-4">
            <div className="col-span-2">
              <label className={labelClass}>Name</label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" required placeholder="+2519XXXXXXXX" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Initial PIN (4-12 digits)</label>
              <input name="pin" required minLength={4} maxLength={12} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Monthly SACCo Payment (Birr)</label>
              <input name="saccoMonthlyPayment" type="number" required min={1} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Term (months)</label>
              <input name="termMonths" type="number" required min={1} defaultValue={12} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cadence</label>
              <select name="cadence" className={inputClass}>
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Language</label>
              <select name="language" className={inputClass}>
                <option value="en">English</option>
                <option value="am">Amharic</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Lender (SACCo/MFI)</label>
              <select name="lenderId" required className={inputClass}>
                {lenders.map((lender) => (
                  <option key={lender.id} value={lender.id}>
                    {lender.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-royal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
              >
                Create driver
              </button>
            </div>
          </form>
        </div>
      </details>
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
