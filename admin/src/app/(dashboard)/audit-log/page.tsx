import { db } from "@/server/db";

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700",
  UPDATE: "bg-royal-50 text-royal-700",
  CORRECT: "bg-amber-50 text-amber-700",
  CASCADE_RECALC: "bg-slate-100 text-slate-600",
};

export default async function AuditLogPage() {
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actorAdmin: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every settlement, driver, and settings change is recorded here — nothing is ever silently overwritten.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Entity</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 last:border-0 align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                  {entry.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-5 py-3 text-slate-900">
                  {entry.entityType} <span className="text-slate-400">/ {entry.entityId.slice(0, 10)}…</span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ACTION_STYLES[entry.action] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">{entry.actorAdmin?.name ?? entry.actorType}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={4}>
                  No audit log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
