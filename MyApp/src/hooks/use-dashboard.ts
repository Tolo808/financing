import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '@/lib/api-client';

// Reads still go through our REST API in Phase A (Supabase Auth/RLS cutover is Phase B) —
// this swap only adds TanStack Query's cache-first, stale-while-revalidate behavior on top,
// so a repeat visit to this screen renders the last-known numbers instantly.
export function useDashboard() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
