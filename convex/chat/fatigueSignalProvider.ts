import { computeFatigueSignal, summarizeRecentWorkouts } from "../../src/domain/chat/rules";
import type { FatigueSignalProvider } from "../../src/domain/chat/ports";
import type { WorkoutVolumeSample } from "../../src/domain/chat/types";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

const RECENT_WORKOUT_LIMIT = 20;

function estimateVolume(entry: {
  strength?: { sets: { reps?: number; targetReps?: number; weight?: number }[] };
  interval?: { workSeconds: number; rounds: number };
}): number {
  if (entry.strength) {
    return entry.strength.sets.reduce(
      (sum, set) => sum + (set.reps ?? set.targetReps ?? 0) * (set.weight ?? 0),
      0,
    );
  }
  if (entry.interval) {
    return entry.interval.workSeconds * entry.interval.rounds;
  }
  return 0;
}

/**
 * Reads through Workout Tracking's own internal query (via ctx.runQuery, since
 * actions have no ctx.db) rather than that context's Convex tables directly —
 * the read-direction counterpart to the write-direction translation boundary
 * (research.md §8, constitution Principle VIII).
 */
export class ConvexFatigueSignalProvider implements FatigueSignalProvider {
  constructor(private ctx: ActionCtx) {}

  async compute(now: number): Promise<{
    fatigueSignal: ReturnType<typeof computeFatigueSignal>;
    recentWorkoutSummary: string;
  }> {
    const workouts = await this.ctx.runQuery(
      internal.workoutTracking.functions.recentWorkoutsWithEntries,
      { limit: RECENT_WORKOUT_LIMIT },
    );

    const samples: WorkoutVolumeSample[] = workouts.map((workout) => ({
      occurredAt: workout.createdAt,
      workoutType: workout.workoutType,
      volume: workout.entries.reduce((sum, entry) => sum + estimateVolume(entry), 0),
    }));

    return {
      fatigueSignal: computeFatigueSignal(samples, now),
      recentWorkoutSummary: summarizeRecentWorkouts(samples, now),
    };
  }
}
