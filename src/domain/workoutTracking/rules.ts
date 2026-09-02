/**
 * Workout Tracking bounded context — pure domain rules (constitution Principle VII).
 * No I/O, no Promises, no port dependency: these are unit-testable in isolation
 * (tests/unit/domain/workoutTracking/rules.test.ts) with no Convex test harness.
 */

import { ValidationError } from "./types";
import type { EntryInput, EntryPatch, ExerciseEntry, WorkoutStatus, WorkoutType } from "./types";

/** Throws if neither strength nor interval is present, or the wrong one is present for workoutType (FR-010). */
export function validateEntry(input: EntryInput, workoutType: WorkoutType): void {
  const hasStrength = input.strength !== undefined;
  const hasInterval = input.interval !== undefined;

  if (!hasStrength && !hasInterval) {
    throw new ValidationError("An entry must have either strength or interval details.");
  }
  if (hasStrength && hasInterval) {
    throw new ValidationError("An entry cannot have both strength and interval details.");
  }

  const wantsInterval = workoutType === "hiit";
  if (wantsInterval && !hasInterval) {
    throw new ValidationError(`A "${workoutType}" workout's entries must have interval details.`);
  }
  if (!wantsInterval && !hasStrength) {
    throw new ValidationError(`A "${workoutType}" workout's entries must have strength details.`);
  }
}

/** Empty list -> 0, otherwise max(order) + 1. Order is a sort key only, never re-sequenced on removal. */
export function nextEntryOrder(existingEntries: { order: number }[]): number {
  if (existingEntries.length === 0) {
    return 0;
  }
  return Math.max(...existingEntries.map((entry) => entry.order)) + 1;
}

/** Merges a partial edit into an entry (FR-008); cannot flip strength<->interval via a patch. */
export function applyEntryPatch(entry: ExerciseEntry, patch: EntryPatch): ExerciseEntry {
  if (patch.strength !== undefined && entry.interval !== undefined) {
    throw new ValidationError("Cannot change an interval entry into a strength entry via a patch.");
  }
  if (patch.interval !== undefined && entry.strength !== undefined) {
    throw new ValidationError("Cannot change a strength entry into an interval entry via a patch.");
  }

  return {
    ...entry,
    strength: patch.strength ?? entry.strength,
    interval: patch.interval ?? entry.interval,
    notes: patch.notes ?? entry.notes,
  };
}

/** Every status transition is valid (FR-009a) — this never throws. `now` is caller-supplied (Date.now() in a mutation). */
export function nextStatus(
  target: WorkoutStatus,
  now: number,
): { status: WorkoutStatus; completedAt: number | null } {
  return {
    status: target,
    completedAt: target === "completed" ? now : null,
  };
}
