"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/server/supabase/browser-client";

export default function MfiLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/mfi");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-royal-800 via-royal-700 to-royal-600 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-royal-700 shadow-lg">
            T
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Tolo Lender Portal</h1>
            <p className="mt-1 text-sm text-royal-100">Loan portfolio performance</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-7 shadow-2xl">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-royal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-800 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
