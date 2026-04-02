# Appliqué depuis ios/Podfile (post_install). Ne pas monter la version fmt sans aligner RCT-Folly.
def cookeat_apply_fmt_consteval_fix(installer)
  installer.pods_project.targets.each do |target|
    next unless target.name == 'fmt'

    target.build_configurations.each do |c|
      defs = c.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
      defs = ['$(inherited)'] if defs.nil?
      defs = [defs] unless defs.is_a?(Array)
      defs = defs.dup
      unless defs.any? { |d| d.to_s.include?('FMT_USE_CONSTEVAL') }
        defs << 'FMT_USE_CONSTEVAL=0'
      end
      c.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
    end
  end

  fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
  return unless File.file?(fmt_base)

  content = File.read(fmt_base)
  return if content.include?('cookeat-fmt-consteval-guard')

  pattern = %r{// Detect consteval, C\+\+20 constexpr extensions and std::is_constant_evaluated\.\n#if !defined\(__cpp_lib_is_constant_evaluated\)\n#  define FMT_USE_CONSTEVAL 0\n}

  replacement = <<~FMT
    // Detect consteval, C++20 constexpr extensions and std::is_constant_evaluated.
    // cookeat-fmt-consteval-guard: fmt 11.x — honours -DFMT_USE_CONSTEVAL=0 (Xcode 26 Clang)
    #ifdef FMT_USE_CONSTEVAL
    // Use the provided definition.
    #elif !defined(__cpp_lib_is_constant_evaluated)
    #  define FMT_USE_CONSTEVAL 0
  FMT

  unless content.match?(pattern)
    Pod::UI.warn '[cocoapods_fmt_fix] fmt/base.h: motif consteval inattendu, patch ignoré'
    return
  end

  File.write(fmt_base, content.sub(pattern, replacement))
end
