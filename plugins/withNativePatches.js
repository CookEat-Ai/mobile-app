const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin pour appliquer des correctifs aux modules natifs incompatibles 
 * avec les versions récentes de React Native (0.81+) ou Gradle.
 */
module.exports = function withNativePatches(config) {
  const projectRoot = process.cwd();

  // 1. Correction de currentActivity dans react-native-purchases-ui (incompatible avec RN 0.81+)
  const purchasesUiPath = path.resolve(
    projectRoot,
    'node_modules/react-native-purchases-ui/android/src/main/java/com/revenuecat/purchases/react/ui'
  );

  const filesToPatch = [
    'RNCustomerCenterModule.kt',
    'RNPaywallsModule.kt'
  ];

  filesToPatch.forEach(fileName => {
    const filePath = path.join(purchasesUiPath, fileName);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      // On remplace currentActivity par getCurrentActivity() ou reactApplicationContext.currentActivity
      // Dans le contexte de ReactContextBaseJavaModule, getCurrentActivity() est le plus sûr.
      if (content.includes('currentActivity')) {
        console.log(`✅ [withNativePatches] Correction currentActivity dans ${fileName}`);
        
        // Cas spécifique pour RNPaywallsModule.kt:25 : val currentActivity = currentActivity
        // On veut : val currentActivity = getCurrentActivity()
        content = content.replace(/val currentActivity = currentActivity/g, 'val currentActivity = getCurrentActivity()');
        
        // Cas général : currentActivity?.let -> getCurrentActivity()?.let
        content = content.replace(/currentActivity\?\./g, 'getCurrentActivity()?.');
        
        // Autres occurrences possibles de currentActivity non suivies de ?.
        // Mais on fait attention à ne pas remplacer les variables locales déjà nommées currentActivity
        // (comme celle qu'on vient de créer avec val currentActivity)
        
        fs.writeFileSync(filePath, content);
      }
    }
  });

  return config;
};
