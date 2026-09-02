/**
 * AI Chat bounded context — pure domain rules (constitution Principle VII).
 * No I/O, no Promises, no port dependency.
 */

import type {
  FatigueBand,
  FatigueSignal,
  GenerationOutcome,
  Preferences,
  WorkoutType,
  WorkoutVolumeSample,
} from "./types";

/** FR-019: true iff the one-time AI-data notice hasn't been shown/acknowledged yet. */
export function shouldShowAiDataNotice(preferences: Preferences): boolean {
  return preferences.aiDataNoticeAcknowledgedAt === null;
}

/**
 * FR-022: short-circuits to a cap-reached error without ever calling the provider when
 * the cap check disallows it; otherwise passes the provider's own result straight through.
 */
export function decideGenerationOutcome(
  cap: { allowed: boolean },
  providerResult: GenerationOutcome | undefined,
): GenerationOutcome {
  if (!cap.allowed) {
    return { kind: "error", reason: "cap_reached" };
  }
  if (!providerResult) {
    throw new Error(
      "decideGenerationOutcome: providerResult is required when the cap allows generation.",
    );
  }
  return providerResult;
}

/**
 * Renders the fatigue signal, recent-workout summary, and stated preferences into the
 * system-prompt context for a generation call (constitution Principles I/II/III).
 */
export function buildPromptContext(input: {
  recentWorkoutSummary: string;
  fatigueSignal: FatigueSignal;
  preferences: Preferences;
}): string {
  const { recentWorkoutSummary, fatigueSignal, preferences } = input;

  const preferenceLines = [
    preferences.goals.length > 0 ? `Goals: ${preferences.goals.join(", ")}.` : null,
    preferences.equipment.length > 0
      ? `Available equipment: ${preferences.equipment.join(", ")}.`
      : null,
    preferences.injuriesToAvoid.length > 0
      ? `Injuries/exercises to avoid: ${preferences.injuriesToAvoid.join(", ")}.`
      : null,
    `Preferred units: ${preferences.unitPreference}.`,
  ].filter((line): line is string => line !== null);

  return [
    "Recent workout history:",
    recentWorkoutSummary || "No workouts logged yet.",
    "",
    `Fatigue/recovery signal: ${fatigueSignal.band} (score ${fatigueSignal.score.toFixed(2)}). ` +
      "Do not recommend a high-intensity session when this indicates a need for recovery.",
    "",
    "Stated preferences:",
    preferenceLines.length > 0 ? preferenceLines.join(" ") : "None stated.",
  ].join("\n");
}

/**
 * Recent-training-load heuristic (research.md §6): a decayed sum of per-workout
 * volume, loosely modeled on the acute:chronic workload ratio concept from sports
 * science. Halves a workout's contribution every 7 days. The normalization
 * constant and band thresholds are a v1 starting point, not a clinical
 * assessment — expected to be tuned once real usage data exists.
 */
const FATIGUE_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
const FATIGUE_NORMALIZATION_CONSTANT = 5000;
const FATIGUE_HIGH_THRESHOLD = 1.5;
const FATIGUE_MODERATE_THRESHOLD = 0.7;

export function computeFatigueSignal(samples: WorkoutVolumeSample[], now: number): FatigueSignal {
  let decayedVolume = 0;
  for (const sample of samples) {
    const ageMs = Math.max(0, now - sample.occurredAt);
    const decay = 2 ** (-ageMs / FATIGUE_HALF_LIFE_MS);
    decayedVolume += sample.volume * decay;
  }

  const score = decayedVolume / FATIGUE_NORMALIZATION_CONSTANT;
  const band: FatigueBand =
    score >= FATIGUE_HIGH_THRESHOLD
      ? "high"
      : score >= FATIGUE_MODERATE_THRESHOLD
        ? "moderate"
        : "recovered";

  return { band, score };
}

const RECENT_SUMMARY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Short plain-language summary of recent training for the AI's prompt context. */
export function summarizeRecentWorkouts(
  workouts: { occurredAt: number; workoutType: WorkoutType }[],
  now: number,
): string {
  if (workouts.length === 0) {
    return "";
  }

  const withinWindow = workouts.filter((w) => now - w.occurredAt <= RECENT_SUMMARY_WINDOW_MS);
  if (withinWindow.length === 0) {
    return `No workouts logged in the last 14 days (${workouts.length} logged previously).`;
  }

  const counts = new Map<WorkoutType, number>();
  for (const workout of withinWindow) {
    counts.set(workout.workoutType, (counts.get(workout.workoutType) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(([type, count]) => `${count} ${type}`);

  return `${withinWindow.length} workout(s) in the last 14 days: ${parts.join(", ")}.`;
}
