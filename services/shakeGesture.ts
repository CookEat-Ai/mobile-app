/** Two separate strong acceleration peaks, with a cooldown to avoid repeated prompts. */
export function createShakeDetector() {
  let previousPeak = -Infinity;
  let cooldownUntil = 0;
  let aboveThreshold = false;
  return (sample: { x: number; y: number; z: number }, now: number) => {
    const strong = Math.hypot(sample.x, sample.y, sample.z) > 2.5;
    const rising = strong && !aboveThreshold;
    aboveThreshold = strong;
    if (!rising || now < cooldownUntil) return false;
    if (now - previousPeak >= 120 && now - previousPeak <= 900) {
      previousPeak = -Infinity; cooldownUntil = now + 5000; return true;
    }
    previousPeak = now; return false;
  };
}
