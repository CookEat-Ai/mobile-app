const fs = require("fs")
const path = require("path")
const { withStringsXml, AndroidConfig } = require("@expo/config-plugins")

/**
 * `config.locales` remplit seulement values-b+{lang}/ ; lint release Android
 * (ExtraTranslation) exige les mêmes clés dans values/strings.xml.
 */
function withAndroidDefaultLocaleStrings(config) {
  return withStringsXml(config, async function (config) {
    const locales = config.locales
    if (!locales || typeof locales !== "object") {
      return config
    }

    const projectRoot = config.modRequest.projectRoot
    const defaultSpec =
      locales.en ?? locales[Object.keys(locales).sort()[0] ?? ""]
    if (!defaultSpec || typeof defaultSpec !== "string") {
      return config
    }

    const absPath = path.resolve(projectRoot, defaultSpec)
    if (!fs.existsSync(absPath)) {
      return config
    }

    let data
    try {
      data = JSON.parse(fs.readFileSync(absPath, "utf8"))
    } catch {
      return config
    }

    const { buildResourceItem } = AndroidConfig.Resources
    const { setStringItem } = AndroidConfig.Strings
    const items = Object.entries(data).map(function ([key, value]) {
      return buildResourceItem({
        name: key,
        value: `"${String(value)}"`,
      })
    })

    config.modResults = setStringItem(items, config.modResults)
    return config
  })
}

module.exports = withAndroidDefaultLocaleStrings
