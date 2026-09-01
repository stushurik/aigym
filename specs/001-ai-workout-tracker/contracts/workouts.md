# Contract: Workouts (`convex/workouts.ts`)

Convex query/mutation function signatures — this is the app's public interface for workout data
(no separate REST/GraphQL layer; the Convex client calls these directly, wrapped by TanStack Query
hooks in `src/hooks/`). Types reference entities in [`../data-model.md`](../data-model.md).

## `listWorkouts` (query)

Supports FR-014 (history list).

- **Args**: none
- **Returns**: `{ _id, workoutType, status, source, title, createdAt, completedAt, entryCount }[]`
  — summary shape (no full entries), newest first
- **Errors**: none (empty array if no workouts logged)

## `getWorkout` (query)

Supports FR-014 (open a past workout), User Story 2 (run a workout).

- **Args**: `{ workoutId: Id<"workouts"> }`
- **Returns**: full `Workout` document including resolved `entries` with each entry's
  `exerciseCatalog` name joined in (so the UI never needs a second round trip to render an entry)
- **Errors**: `NotFound` if `workoutId` doesn't exist

## `createWorkout` (mutation)

Supports FR-015 (manual creation) and the "accept AI proposal" step of FR-006.

- **Args**: `{ workoutType: WorkoutType; title?: string; source: "ai" | "manual"; entries: ExerciseEntryInput[]; chatConversationId?: Id<"chatConversations"> }`
- **Returns**: `{ workoutId: Id<"workouts"> }`
- **Behavior**: each `ExerciseEntryInput` carries an exercise *name*, not yet a catalog id; the
  mutation resolves/creates catalog entries via the same match-or-create logic as
  `exerciseCatalog.resolveOrCreate` (see `exercise-catalog.md`) before writing `entries`
- **Errors**: `ValidationError` if `entries[i]` lacks both `strength` and `interval` fields, or if
  they don't match `workoutType`

## `updateWorkoutStatus` (mutation)

Supports the `draft → in_progress → completed` display transitions (data-model.md).

- **Args**: `{ workoutId: Id<"workouts">; status: "draft" | "in_progress" | "completed" }`
- **Returns**: `void`
- **Behavior**: sets `completedAt` when transitioning to `completed`; never blocks the transition
  based on entry content (an empty workout may still be marked any status — confirmation before
  *running* an empty workout is a UI-level guard, not enforced here)
- **Errors**: `NotFound`

## `addEntry` (mutation)

Supports FR-007.

- **Args**: `{ workoutId: Id<"workouts">; exerciseName: string; order?: number; strength?: {...}; interval?: {...}; notes?: string }`
- **Returns**: `{ entryIndex: number }`
- **Behavior**: resolves `exerciseName` through the catalog match-or-create path (FR-021); appends
  at `order` (default: end of list); works regardless of `Workout.status` (FR-009a)
- **Errors**: `ValidationError` if neither `strength` nor `interval` is provided

## `editEntry` (mutation)

Supports FR-008.

- **Args**: `{ workoutId: Id<"workouts">; entryIndex: number; strength?: {...}; interval?: {...}; notes?: string }`
- **Returns**: `void`
- **Behavior**: partial update of the fields provided; works regardless of `Workout.status`
  (FR-009a); does not interrupt an active client-side timer (the client owns timer state, per
  research.md §1 — this mutation only persists the logged values)
- **Errors**: `NotFound` if `entryIndex` is out of range

## `removeEntry` (mutation)

Supports FR-009.

- **Args**: `{ workoutId: Id<"workouts">; entryIndex: number }`
- **Returns**: `void`
- **Behavior**: removes the entry and re-sequences remaining `order` values; workout MAY become
  empty (`entries: []`) — this is a valid state, not an error
- **Errors**: `NotFound` if `entryIndex` is out of range
