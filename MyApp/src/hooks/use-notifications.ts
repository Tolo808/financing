import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types/api';

const NOTIFICATIONS_KEY = ['notifications'];

// No explicit driverId filter — the notifications_select_own RLS policy already scopes this to
// the signed-in driver's own rows.
async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data as AppNotification[];
}

async function markNotificationRead(id: string): Promise<void> {
  // Governed by the notifications_update_own RLS policy — a driver can only update their own rows.
  const { error } = await supabase
    .from('notifications')
    .update({ readAt: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<AppNotification[]>(NOTIFICATIONS_KEY, (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    },
  });

  return {
    notifications: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
    markRead: markReadMutation.mutateAsync,
  };
}
