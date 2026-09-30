# RevenueCat 5.33 declares every PaywallColor initializer in extensions. Swift
# 6.4 also synthesizes init(stringRepresentation:), conflicting with the public
# throwing initializer. Moving the existing designated initializer into the
# struct suppresses synthesis without changing color parsing or its public API.
def cookeat_apply_revenuecat_swift_fix(installer)
  source = File.join(installer.sandbox.root, 'RevenueCat', 'Sources', 'Paywalls', 'PaywallColor.swift')
  return unless File.file?(source)

  content = File.read(source)
  return if content.include?('cookeat-revenuecat-swift64-fix')

  initializer = <<~'SWIFT'.lines.map { |line| line.strip.empty? ? line : "    #{line}" }.join
    /// "Designated" initializer
    private init(stringRepresentation: String, underlyingColor: (any Sendable)?) {
        self.stringRepresentation = stringRepresentation
        self._underlyingColor = underlyingColor
    }
  SWIFT
  anchor = "    fileprivate var _underlyingColor: (any Sendable)?\n"

  # Other SDK versions may have already fixed or redesigned this type.
  return unless content.include?(initializer) && content.include?(anchor)

  patched = content.sub(initializer, '').sub(
    anchor,
    "#{anchor}\n    // cookeat-revenuecat-swift64-fix\n#{initializer}"
  )
  File.chmod(File.stat(source).mode | 0200, source)
  File.write(source, patched)
  Pod::UI.puts '[CookEat] Applied RevenueCat PaywallColor compatibility fix for Swift 6.4'
end
