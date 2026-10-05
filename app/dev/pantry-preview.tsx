import React, { useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { PantryScanView } from '../../components/planning/PantryScanView';
import { PlanningLoadingView } from '../../components/loading/PlanningLoadingView';

/** Local visual QA only; never recognises food or creates a plan. */
export default function PantryPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const [week, setWeek] = useState(false);
  if (!__DEV__) return <Redirect href="/" />;
  const ingredients = ['Poulet', 'Œufs', 'Courgettes', 'Riz', 'Feta', 'Tomates'];
  if (week || state === 'week' || state === 'ready') return <PlanningLoadingView ready={state === 'ready'} onComplete={() => undefined} />;
  return <PantryScanView photoUris={[]} ingredients={state === 'scan' ? null : state === 'empty' ? [] : ingredients} saving={false} onConfirm={() => setWeek(true)} onRetake={() => setWeek(false)} />;
}
