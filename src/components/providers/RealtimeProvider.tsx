import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const matchesSub = supabase
      .channel('public:matches')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['match'] });
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
          void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
          void queryClient.invalidateQueries({ queryKey: ['match-history'] });
        }
      )
      .subscribe();

    const inningsSub = supabase
      .channel('public:innings')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'innings' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['innings'] });
          void queryClient.invalidateQueries({ queryKey: ['match'] });
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
          void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
        }
      )
      .subscribe();

    const ballEventsSub = supabase
      .channel('public:ball_events')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ball_events' },
        (payload) => {
          const inningsId = (payload.new as Record<string, unknown> | null)?.innings_id as string | undefined;
          if (inningsId) {
            void queryClient.invalidateQueries({ queryKey: ['ball-events', inningsId] });
          }
          void queryClient.invalidateQueries({ queryKey: ['ball-events'] });
          void queryClient.invalidateQueries({ queryKey: ['ball-events-all'] });
          void queryClient.invalidateQueries({ queryKey: ['match'] });
          void queryClient.invalidateQueries({ queryKey: ['matches'] });
          void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
          void queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(matchesSub);
      void supabase.removeChannel(inningsSub);
      void supabase.removeChannel(ballEventsSub);
    };
  }, [queryClient]);

  return <>{children}</>;
}
