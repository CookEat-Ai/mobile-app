const { withPodfile } = require('@expo/config-plugins');

const marker = '# cookeat-revenuecat-swift-fix';

module.exports = function withRevenueCatSwiftFix(config) {
  return withPodfile(config, (cfg) => {
    const contents = cfg.modResults.contents;
    if (contents.includes(marker)) return cfg;

    const anchor = '  post_install do |installer|';
    if (!contents.includes(anchor)) {
      throw new Error('[withRevenueCatSwiftFix] CocoaPods post_install hook not found');
    }
    cfg.modResults.contents = contents.replace(anchor, `${anchor}
    ${marker}
    load File.expand_path('../plugins/cocoapods_revenuecat_swift_fix.rb', __dir__)
    cookeat_apply_revenuecat_swift_fix(installer)`);
    return cfg;
  });
};
