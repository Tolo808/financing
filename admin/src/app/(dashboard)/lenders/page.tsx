import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { listLenders, createLender, createMfiUser } from "@/server/services/lender-service";
import { createLenderSchema, createMfiUserSchema } from "@/lib/validation";

async function createLenderAction(formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const parsed = createLenderSchema.safeParse({
    name: formData.get("name"),
    contactEmail: formData.get("contactEmail") || null,
  });
  if (!parsed.success) throw new Error("Invalid lender input");

  await createLender(parsed.data, admin.id);
  revalidatePath("/lenders");
}

async function createMfiUserAction(formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const parsed = createMfiUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    lenderId: formData.get("lenderId"),
  });
  if (!parsed.success) throw new Error("Invalid MFI user input");

  await createMfiUser(parsed.data, admin.id);
  revalidatePath("/lenders");
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100";
const labelClass = "block text-sm font-medium text-slate-700";

export default async function LendersPage() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") notFound();

  const lenders = await listLenders();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Lenders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Financing partners (SACCos/MFIs) and their portal users. Assign drivers to a lender from
          each driver&apos;s edit form.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Contact Email</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {lenders.map((lender) => (
              <tr key={lender.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3.5 font-medium text-slate-900">{lender.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{lender.contactEmail ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      lender.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {lender.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {lenders.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={3}>
                  No lenders yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
          <span>+ Add Lender</span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-100 px-6 py-6">
          <form action={createLenderAction} className="grid max-w-lg grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact email (optional)</label>
              <input name="contactEmail" type="email" className={inputClass} />
            </div>
            <div>
              <button
                type="submit"
                className="rounded-lg bg-royal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
              >
                Create lender
              </button>
            </div>
          </form>
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
          <span>+ Add MFI Portal User</span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-100 px-6 py-6">
          <form action={createMfiUserAction} className="grid max-w-lg grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Lender</label>
              <select name="lenderId" required className={inputClass}>
                {lenders.map((lender) => (
                  <option key={lender.id} value={lender.id}>
                    {lender.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input name="name" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input name="password" type="password" required minLength={6} className={inputClass} />
            </div>
            <div>
              <button
                type="submit"
                className="rounded-lg bg-royal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
              >
                Create MFI user
              </button>
            </div>
          </form>
        </div>
      </details>
    </div>
  );
}
