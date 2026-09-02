/**
 * Workout Tracking bounded context — ports (constitution Principle VII).
 * Domain rules (rules.ts) and the Convex function handlers that use them depend on
 * these interfaces, never on a concrete Convex type. convex/workoutTracking/repository.ts
 * provides the implementations.
 */

import type {
  EntryInput,
  EntryPatch,
  ExerciseEntry,
  ExerciseEntryId,
  ExerciseId,
  Workout,
  WorkoutDraftInput,
  WorkoutId,
  WorkoutStatus,
  WorkoutSummary,
} from "./types";

export interface WorkoutRepository {
  get(workoutId: WorkoutId): Promise<Workout | null>;
  list(paginationOpts: { numItems: number; cursor: string | null }): Promise<{
    page: WorkoutSummary[];
    isDone: boolean;
    continueCursor: string;
  }>;
  /** Creates the Workout row only — entries are created separately via ExerciseEntryRepository. */
  create(input: Omit<WorkoutDraftInput, "entries">): Promise<WorkoutId>;
  setStatus(workoutId: WorkoutId, status: WorkoutStatus, completedAt: number | null): Promise<void>;
  /** Bumps updatedAt — called after any entry add/edit/remove. */
  touch(workoutId: WorkoutId): Promise<void>;
}

export interface ExerciseEntryRepository {
  get(entryId: ExerciseEntryId): Promise<ExerciseEntry | null>;
  /** Ordered by `order`, via the by_workoutId_and_order index — no in-memory sort. */
  listByWorkout(workoutId: WorkoutId): Promise<ExerciseEntry[]>;
  add(
    workoutId: WorkoutId,
    exerciseCatalogId: ExerciseId,
    input: EntryInput,
    order: number,
  ): Promise<ExerciseEntryId>;
  edit(entryId: ExerciseEntryId, patch: EntryPatch): Promise<void>;
  /** Does NOT re-sequence remaining entries' `order` — see data-model.md. */
  remove(entryId: ExerciseEntryId): Promise<void>;
}

export interface ExerciseCatalogRepository {
  getById(exerciseId: ExerciseId): Promise<{ id: ExerciseId; name: string } | null>;
  search(query: string, limit?: number): Promise<{ id: ExerciseId; name: string }[]>;
  resolveOrCreate(
    name: string,
    createdBy: "user" | "ai",
  ): Promise<{ id: ExerciseId; created: boolean }>;
}
