const { withPodfile } = require("@expo/config-plugins")

const BEGIN = "# >>> cookeat-fmt-consteval-fix"
const END = "# <<< cookeat-fmt-consteval-fix"

function stripFix(contents) {
  return contents.replace(
    new RegExp(`\\n    ${BEGIN}[\\s\\S]*?\\n    ${END}\\n`, "g"),
    "\n"
  )
}

/**
 * Xcode 26+ / Apple Clang : fmt 11 (RN) + FMT_STRING + consteval.
 * -GCC_PREPROCESSOR_DEFINITIONS seul ne suffit pas : base.h redéfinit FMT_USE_CONSTEVAL.
 * Logique dans plugins/cocoapods_fmt_fix.rb (patch base.h + flags).
 */
module.exports = function withFmtPodfileFix(config) {
  return withPodfile(config, (cfg) => {
    let contents = stripFix(cfg.modResults.contents)

    const rubyBlock = [
      `    ${BEGIN}`,
      `    load File.expand_path('../plugins/cocoapods_fmt_fix.rb', __dir__)`,
      `    cookeat_apply_fmt_consteval_fix(installer)`,
      `    ${END}`,
    ].join("\n")

    const anchor =
      /(react_native_post_install\(\s*\n\s*installer,\s*\n\s*config\[:reactNativePath\],\s*\n\s*:mac_catalyst_enabled => false,\s*\n\s*:ccache_enabled => [^\n]+,\s*\n\s*\))\s*\n(\s*end)/m

    if (!anchor.test(contents)) {
      console.warn(
        "[withFmtPodfileFix] post_install / react_native_post_install : ancre introuvable, correctif fmt non appliqué."
      )
      return cfg
    }

    cfg.modResults.contents = contents.replace(anchor, `$1\n${rubyBlock}\n$2`)
    return cfg
  })
}
