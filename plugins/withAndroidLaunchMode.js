const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

/**
 * RevenueCat déconseille `singleTask` pour l'activité qui lance un achat :
 * certains retours Play Store peuvent recréer une Activity et annuler le flux.
 * Expo génère cette valeur, donc on la corrige à chaque prebuild plutôt que de
 * modifier le dossier android/ ignoré par Git.
 */
module.exports = function withAndroidLaunchMode(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      androidConfig.modResults,
    );
    mainActivity.$['android:launchMode'] = 'singleTop';
    return androidConfig;
  });
};
