import React, { useMemo } from 'react';
import { Redirect } from 'expo-router';
import { importedMealsRoute } from '../../services/importedMealNavigation';

/** Older links open the current meal library instead of the retired screen. */
export default function ImportedScreen() {
  const href = useMemo(() => importedMealsRoute(), []);
  return <Redirect href={href} />;
}
