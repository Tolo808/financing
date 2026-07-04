import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { db } from "@/server/db";
import { writeAuditLog } from "@/server/services/audit-service";
import { updateGlobalSettingsSchema } from "@/lib/validation";

async function updateSettingsAction(formData: FormData) {
  "use server";
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Unauthorized");

  const priceTiersRaw = String(formData.get("priceTiers") ?? "");
  const priceTiers = priceTiersRaw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  const parsed = updateGlobalSettingsSchema.safeParse({
    toloTargetBirr: Number(formData.get("toloTargetBirr")),
    toloRatePercent: Number(formData.get("toloRatePercent")),
    priceTiers,
  });
  if (!parsed.success) throw new Error("Invalid settings input");

  const before = await db.globalSettings.findUnique({ where: { id: "singleton" } });
  const after = await db.globalSettings.update({
    where: { id: "singleton" },
    data: { ...parsed.data, updatedByAdminId: admin.id },
  });

  await writeAuditLog(db, {
    entityType: "GlobalSettings",
    entityId: "singleton",
    action: "UPDATE",
    beforeJson: before,
    afterJson: after,
    actorType: "ADMIN",
    actorAdminId: admin.id,
  });

  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const settings = await db.globalSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Global Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Defaults applied to all drivers. Per-driver overrides take precedence.
        </p>
      </div>

      <section className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={updateSettingsAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tolo recovery target (Birr)</label>
            <input
              name="toloTargetBirr"
              type="number"
              defaultValue={settings.toloTargetBirr.toString()}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Tolo rate (%)</label>
            <input
              name="toloRatePercent"
              type="number"
              step="0.01"
              defaultValue={settings.toloRatePercent.toString()}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Price list (Birr per order, comma-separated)
            </label>
            <input
              name="priceTiers"
              type="text"
              defaultValue={(settings.priceTiers as unknown as number[]).join(", ")}
              placeholder="150, 250, 350, 450"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100"
            />
            <p className="mt-1 text-xs text-slate-400">Used as the order-price tiers on the Settlement page.</p>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-royal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800"
          >
            Save
          </button>
        </form>
      </section>
    </div>
  );
}
