const { withPodfile } = require('@expo/config-plugins');

const marker = '# cookeat-compatible-bash';
module.exports = function withCocoaPodsBashFix(config) {
  return withPodfile(config, (cfg) => {
    if (cfg.modResults.contents.includes(marker)) return cfg;
    const anchor = '  post_install do |installer|';
    if (!cfg.modResults.contents.includes(anchor)) {
      throw new Error('[withCocoaPodsBashFix] CocoaPods post_install hook not found');
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(anchor, `${anchor}
    ${marker}
    load File.expand_path('../plugins/cocoapods_bash_fix.rb', __dir__)
    cookeat_apply_bash_fix(installer)`);
    return cfg;
  });
};
