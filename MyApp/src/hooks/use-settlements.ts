import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Settlement } from '@/types/api';

// No explicit driverId filter — the settlements_select_own RLS policy already scopes this to
// the signed-in driver's own rows.
async function fetchSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('periodIndex', { ascending: false });
  if (error) throw error;
  return data as Settlement[];
}

export function useSettlements() {
  const query = useQuery({
    queryKey: ['settlements'],
    queryFn: fetchSettlements,
  });

  return {
    settlements: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
