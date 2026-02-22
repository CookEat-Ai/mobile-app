const { withGradleProperties } = require("@expo/config-plugins")

function withCustomGradleProperties(config) {
  return withGradleProperties(config, function (config) {
    const additionalProperties = [
      // SDK 52: https://github.com/expo/expo/issues/30725
      { type: "property", key: "android.enableJetifier", value: "true" },
      {
        type: "property",
        key: "android.enablePngCrunchInReleaseBuilds",
        value: "true",
      },
    ]

    const overrideProperties = [
      {
        type: "property",
        key: "org.gradle.jvmargs",
        value: "-Xmx4096m -XX:MaxMetaspaceSize=512m",
      },
    ]

    overrideProperties.forEach(function (prop) {
      const idx = config.modResults.findIndex(
        function (p) { return p.type === "property" && p.key === prop.key }
      )
      if (idx !== -1) {
        config.modResults[idx].value = prop.value
      } else {
        config.modResults.push(prop)
      }
    })

    additionalProperties.forEach(function (gradleProperty) {
      config.modResults.push(gradleProperty)
    })

    return config
  })
}

module.exports = withCustomGradleProperties