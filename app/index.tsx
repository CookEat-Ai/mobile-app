import { Redirect } from 'expo-router';
import * as QuickActions from 'expo-quick-actions';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { resetVoiceCompletely } from '../hooks/useVoice';
import { TRY_FREE_QUICK_ACTION_ID } from '../services/quickActions';
import {
  type AppEntryRoute,
  resolveAppEntryRoute,
} from '../services/appEntryRoute';

export default function RootLayout() {
  const [entryRoute, setEntryRoute] = useState<AppEntryRoute | null>(null);

  useEffect(() => {
    // Le layout racine traite l'action et ouvre directement le paywall. Lors
    // d'un lancement a froid, ne pas laisser le routage normal de `/` gagner la
    // course et remplacer ensuite ce paywall par l'onboarding ou les onglets.
    if (QuickActions.initial?.id === TRY_FREE_QUICK_ACTION_ID) {
      return;
    }

    // loadLanguageFromStorage();
    void resolveAppEntryRoute()
      .then(setEntryRoute)
      .catch((error) => {
        console.error('❌ Erreur lors de la vérification du statut:', error);
        setEntryRoute('/onboarding/welcome');
      });
    resetVoiceCompletely();
  }, []);

  if (!entryRoute)
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.light.button} />
      </View>
    )

  return <Redirect href={entryRoute} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
