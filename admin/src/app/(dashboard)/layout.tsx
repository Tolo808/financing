import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { createSupabaseServerClient } from "@/server/supabase/server-client";
import { SidebarNav } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }

  const initials = (admin.name ?? admin.email ?? "A")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col bg-royal-800">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base font-bold text-royal-700">
            T
          </div>
          <div>
            <div className="text-base font-semibold text-white">Tolo</div>
            <div className="text-xs text-royal-200">Admin Portal</div>
          </div>
        </div>

        <SidebarNav />

        <div className="border-t border-royal-700/60 px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {admin.name ?? admin.email}
              </div>
              <div className="truncate text-xs text-royal-200">{admin.email}</div>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              const supabase = await createSupabaseServerClient();
              await supabase.auth.signOut();
              redirect("/login");
            }}
          >
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-royal-100 transition-colors hover:bg-royal-700/60 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
