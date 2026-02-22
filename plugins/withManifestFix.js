const { withAndroidManifest } = require("@expo/config-plugins")

function withManifestFix(config) {
  return withAndroidManifest(config, function (config) {
    const mainApplication =
      config.modResults.manifest.application &&
      config.modResults.manifest.application[0]

    if (mainApplication) {
      mainApplication.$["tools:replace"] = [
        mainApplication.$["tools:replace"],
        "android:fullBackupContent",
        "android:dataExtractionRules",
      ]
        .filter(Boolean)
        .join(",")
    }

    return config
  })
}

module.exports = withManifestFix
