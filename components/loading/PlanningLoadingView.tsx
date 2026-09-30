import React, { useCallback, useEffect, useRef, useState } from 'react';
import { waitForPlanningMinimumDuration } from '../../services/weeklyPlanning';
import { ClassicLoadingView } from './ClassicLoadingView';

// No measured percentage is available from the API. Animate a travelling bar
// while waiting, then fill it only when the validated plan is really ready.
export function PlanningLoadingView({ ready = false, onComplete }: { ready?: boolean; onComplete?: () => void }) {
  return <ClassicLoadingView messageKey="planningLoading.title" mode="request" ready={ready} onComplete={onComplete} />;
}

export function usePlanningLoading() {
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);
  const barCompleted = useRef(false);
  const resolveCompletion = useRef<((completed: boolean) => void) | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; resolveCompletion.current?.(false); resolveCompletion.current = null; };
  }, []);
  const reset = useCallback(() => { barCompleted.current = false; setReady(false); }, []);
  const onComplete = useCallback(() => { barCompleted.current = true; resolveCompletion.current?.(true); resolveCompletion.current = null; }, []);
  const finish = useCallback(async (startedAt: number): Promise<boolean> => {
    await waitForPlanningMinimumDuration(startedAt);
    if (!mounted.current) return false;
    if (barCompleted.current) return true;
    resolveCompletion.current?.(false);
    return new Promise<boolean>(resolve => { resolveCompletion.current = resolve; setReady(true); });
  }, []);
  return { ready, reset, finish, onComplete };
}
