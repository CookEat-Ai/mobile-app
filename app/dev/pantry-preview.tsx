import React, { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { PantryScanView } from '../../components/planning/PantryScanView';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { PlanningFlowHeader } from '../../components/planning/PlanningFlowHeader';
import { PantryModeChoice } from '../../components/planning/PantryModeChoice';
import { appStyles } from '../../constants/AppTheme';
import { PlanningLoadingView } from '../../components/loading/PlanningLoadingView';

/** Local visual QA only; never recognises food or creates a plan. */
export default function PantryPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'review' | 'shopping' | 'week'>(state === 'shopping' ? 'shopping' : 'review');
  const [names, setNames] = useState(['Poulet', 'Œufs', 'Courgettes', 'Riz', 'Feta', 'Tomates']);
  if (!__DEV__) return <Redirect href="/" />;
  if (phase === 'week' || state === 'week' || state === 'ready') return <PlanningLoadingView ready={state === 'ready'} onComplete={() => undefined} />;
  if (phase === 'shopping') return <View style={appStyles.screen}><PlanningFlowHeader onBack={() => setPhase('review')} progress={2 / 7} /><View style={{ padding: 20, gap: 24 }}><PantryModeChoice value={null} onChange={() => setPhase('week')} /><Text style={appStyles.subtitle}>{t('pantryReview.keptCount', { count: names.length })}</Text></View></View>;
  return <PantryScanView photoUris={[]} ingredients={state === 'scan' ? null : state === 'empty' ? [] : names} saving={false} onConfirm={next => { setNames(next); setPhase(next.length ? 'shopping' : 'week'); }} onRetake={() => setPhase('review')} onBack={() => router.back()} />;
}
