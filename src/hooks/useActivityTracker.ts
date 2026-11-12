import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track user activity and update last_activity in the database
 * This enables accurate "online users" counting in the admin dashboard
 * OPTIMIZED: Reduced frequency and removed expensive event listeners
 */
export const useActivityTracker = () => {
  const lastUpdateRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = useCallback(async () => {
    // Throttle: Only update if 60 seconds have passed since last update
    const now = Date.now();
    if (now - lastUpdateRef.current < 60000) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        lastUpdateRef.current = now;
        await supabase.rpc('update_user_activity');
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.debug('Activity update failed:', error);
    }
  }, []);

  useEffect(() => {
    // Update activity on mount (with small delay to not block initial render)
    const initialTimeout = setTimeout(updateActivity, 1000);

    // Update activity every 3 minutes (reduced from 2 minutes)
    intervalRef.current = setInterval(updateActivity, 3 * 60 * 1000);

    // Only listen to click events (removed scroll, mousemove, keypress)
    // These are expensive and unnecessary for activity tracking
    const handleClick = () => updateActivity();
    window.addEventListener('click', handleClick, { passive: true });

    // Update on visibility change (when user returns to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('click', handleClick);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [updateActivity]);
};
