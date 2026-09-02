/**
 * The bounded-context translation boundary (constitution Principle VIII,
 * research.md §8) — the ONLY module allowed to import both
 * src/domain/chat/types.ts and src/domain/workoutTracking/types.ts. Converts
 * an AI Chat context's ProposalDraft (its own DTO) into the shape Workout
 * Tracking's createWorkout accepts. `source` and `originatingChatConversationId`
 * are set by the caller (acceptProposal), not derivable from the proposal itself.
 */

import type { ProposalDraft } from "../chat/types";
import type { WorkoutDraftInput } from "../workoutTracking/types";

export function proposalToWorkoutDraft(
  proposal: ProposalDraft,
): Pick<WorkoutDraftInput, "workoutType" | "title" | "entries"> {
  return {
    workoutType: proposal.workoutType,
    title: proposal.title,
    entries: proposal.entries.map((entry) => ({
      exerciseName: entry.exerciseName,
      strength: entry.strength,
      interval: entry.interval,
      notes: entry.notes,
    })),
  };
}
