/** Reapply the filter even when Meals was already open during an earlier import. */
export function importedMealsRoute() {
  return { pathname: '/(tabs)/meals' as const, params: { filter: 'imported', selectionKey: String(Date.now()) } };
}

export function importedRecipeRoute(recipeId: string) {
  return { pathname: '/recipe-detail' as const, params: {
    recipeId, showGenerateButton: 'false', isHistory: 'true', source: 'imported',
  } };
}
