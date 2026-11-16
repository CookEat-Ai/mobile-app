module.exports = {
  dependencies: {
    'react-native-appsflyer': {
      platforms: {
        android: {
          // Expo's autolinker qualifies only the first package in a multi-package
          // dependency. AppsFlyer registers both attribution and its connector.
          packageInstance:
            'new RNAppsFlyerPackage(),\n' +
            'new com.appsflyer.reactnative.PCAppsFlyerPackage()',
        },
      },
    },
  },
};
