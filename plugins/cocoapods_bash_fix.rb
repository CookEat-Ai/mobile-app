# Xcode supplies its own PATH, which can prefer an old Intel Homebrew bash.
def cookeat_apply_bash_fix(installer)
  prefix = 'export PATH="/opt/homebrew/bin:/bin:$PATH"'
  installer.pods_project.targets.each do |target|
    target.shell_script_build_phases.each do |phase|
      script = phase.shell_script
      next unless script && script.match?(/\bbash\b/)
      script = script.delete_prefix("#{prefix}\n")

      # Login shells reload legacy Intel paths from ~/.bash_profile.
      script = script.gsub(/\bbash -l -c\b/, '/bin/bash -c')
      phase.shell_script = "#{prefix}\n#{script}"
    end
  end
end
