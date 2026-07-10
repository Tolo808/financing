import { redirect } from "next/navigation";
import { getCurrentMfiUser } from "@/server/auth/current-mfi-user";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

export default async function MfiLayout({ children }: { children: React.ReactNode }) {
  const mfiUser = await getCurrentMfiUser();
  if (!mfiUser) {
    redirect("/mfi/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <div>
            <div className="text-base font-semibold text-slate-900">{mfiUser.lenderName}</div>
            <div className="text-xs text-slate-500">Loan Portfolio Portal</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{mfiUser.email}</span>
            <form
              action={async () => {
                "use server";
                const supabase = await createSupabaseServerClient();
                await supabase.auth.signOut();
                redirect("/mfi/login");
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
    </div>
  );
}
