/**
 * Workout Tracking bounded context — domain types (constitution Principle VIII).
 * No Convex imports here: these are the plain shapes domain rules and ports operate
 * on; convex/workoutTracking/repository.ts maps Convex documents to/from them.
 */

export type WorkoutId = string;
export type ExerciseEntryId = string;
export type ExerciseId = string;

export type WorkoutType = "strength" | "hiit" | "cardio" | "circuit";
export type WorkoutStatus = "draft" | "in_progress" | "completed";
export type WorkoutSource = "ai" | "manual";

export interface Workout {
  id: WorkoutId;
  workoutType: WorkoutType;
  status: WorkoutStatus;
  source: WorkoutSource;
  title?: string;
  originatingChatConversationId?: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface WorkoutSummary {
  id: WorkoutId;
  workoutType: WorkoutType;
  status: WorkoutStatus;
  source: WorkoutSource;
  title?: string;
  createdAt: number;
  completedAt: number | null;
}

export interface Set {
  targetReps?: number;
  reps?: number;
  weight?: number;
  completedAt?: number;
}

export interface StrengthDetails {
  sets: Set[];
}

export interface IntervalDetails {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  completedRounds?: number;
}

export interface ExerciseEntry {
  id: ExerciseEntryId;
  workoutId: WorkoutId;
  exerciseCatalogId: ExerciseId;
  order: number;
  strength?: StrengthDetails;
  interval?: IntervalDetails;
  notes?: string;
}

/** What a caller supplies for one entry; type-appropriate to the parent Workout's workoutType (FR-010). */
export interface EntryInput {
  strength?: StrengthDetails;
  interval?: IntervalDetails;
  notes?: string;
}

/** Partial update to an existing entry (FR-008) — cannot flip strength<->interval via a patch. */
export interface EntryPatch {
  strength?: StrengthDetails;
  interval?: IntervalDetails;
  notes?: string;
}

export interface WorkoutDraftEntryInput extends EntryInput {
  exerciseName: string;
}

/** Input to WorkoutRepository.create (FR-006, FR-015). */
export interface WorkoutDraftInput {
  workoutType: WorkoutType;
  title?: string;
  source: WorkoutSource;
  entries: WorkoutDraftEntryInput[];
  originatingChatConversationId?: string;
}

export class ValidationError extends Error {}
