import { useEffect, useState } from 'react';
import analytics from '../services/analytics';
import {
  resolveOnboardingAnnualTrial,
  type ResolvedTrialOffer,
} from '../services/trialEligibility';

const INITIAL_STATE: ResolvedTrialOffer = {
  status: 'unknown',
  days: null,
  offering: null,
  package: null,
};

export function useOnboardingTrialEligibility(): ResolvedTrialOffer & { loading: boolean } {
  const [state, setState] = useState<ResolvedTrialOffer>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const entryFeature = await analytics.getEntryFeature();
      const result = await resolveOnboardingAnnualTrial(entryFeature);
      if (!cancelled) {
        setState(result);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, loading };
}
