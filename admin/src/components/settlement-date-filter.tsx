"use client";

import { useRouter } from "next/navigation";

export function SettlementDateFilter({ date }: { date: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        defaultValue={date}
        onChange={(e) => router.push(`/settlement?date=${e.target.value}`)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
      />
      <button
        type="button"
        onClick={() => router.push("/settlement")}
        className="text-slate-400 hover:text-slate-600"
        title="Clear date filter"
      >
        ✕
      </button>
    </div>
  );
}
