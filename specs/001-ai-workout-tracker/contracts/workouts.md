# Contract: Workouts (`convex/workoutTracking/functions.ts`)

Convex query/mutation function signatures — this is the app's public interface for workout data
(no separate REST/GraphQL layer; the Convex client calls these directly, wrapped by TanStack Query
hooks in `src/hooks/`). Types reference entities in [`../data-model.md`](../data-model.md). Each
handler here is a thin wrapper: load via `WorkoutRepository`/`ExerciseEntryRepository`, call the
matching pure function in `src/domain/workoutTracking/rules.ts`, persist via the repositories — see
[`workout-tracking-domain.md`](./workout-tracking-domain.md) for those signatures. Entries are
addressed by `Id<"exerciseEntries">`, not an array index (2026-09-02 revision — see data-model.md).

## `listWorkouts` (query)

Supports FR-014 (history list).

- **Args**: `{ paginationOpts: PaginationOptions }` (via `paginationOptsValidator` — per Convex
  guidelines, never an unbounded `.collect()`)
- **Returns**: paginated `{ _id, workoutType, status, source, title, createdAt, completedAt }[]`
  page — summary shape (no entries), newest first via the default `by_creation_time` index
- **Errors**: none (empty page if no workouts logged)

## `getWorkoutWithEntries` (query)

Supports FR-014 (open a past workout), User Story 2 (run a workout).

- **Args**: `{ workoutId: Id<"workouts"> }`
- **Returns**: `{ workout: Workout; entries: (ExerciseEntry & { exerciseName: string })[] }` — the
  `Workout` row plus its `exerciseEntries` (via `ExerciseEntryRepository.listByWorkout`, ordered),
  each joined with its `exerciseCatalog` name so the UI never needs a second round trip to render
  an entry
- **Errors**: `NotFound` if `workoutId` doesn't exist

## `createWorkout` (mutation)

Supports FR-015 (manual creation) and the "accept AI proposal" step of FR-006.

- **Args**: `{ workoutType: WorkoutType; title?: string; source: "ai" | "manual"; entries: ExerciseEntryInput[]; originatingChatConversationId?: string }`
  (`originatingChatConversationId` is an opaque string, not a typed `Id<"chatConversations">` —
  Workout Tracking does not depend on the AI Chat context's types, per Principle VIII)
- **Returns**: `{ workoutId: Id<"workouts"> }`
- **Behavior**: inserts the `Workout` row, then for each `ExerciseEntryInput` (which carries an
  exercise *name*, not yet a catalog id): resolves/creates the catalog entry via
  `ExerciseCatalogRepository.resolveOrCreate`, computes `order` via `rules.ts`'s
  `nextEntryOrder`, and inserts an `exerciseEntries` row. When called from `acceptProposal`
  (chat.md), the caller is `src/domain/shared/translation.ts`'s `proposalToWorkoutDraft` output,
  not the AI Chat context calling this mutation directly.
- **Errors**: `ValidationError` if `entries[i]` lacks both `strength` and `interval` fields, or if
  they don't match `workoutType` (checked via `rules.ts`'s `validateEntry`)

## `updateWorkoutStatus` (mutation)

Supports the `draft → in_progress → completed` display transitions (data-model.md).

- **Args**: `{ workoutId: Id<"workouts">; status: "draft" | "in_progress" | "completed" }`
- **Returns**: `void`
- **Behavior**: `rules.ts`'s `nextStatus` computes `completedAt`; never blocks the transition based
  on entry content (an empty workout may still be marked any status — confirmation before *running*
  an empty workout is a UI-level guard, not enforced here)
- **Errors**: `NotFound`

## `addEntry` (mutation)

Supports FR-007.

- **Args**: `{ workoutId: Id<"workouts">; exerciseName: string; strength?: {...}; interval?: {...}; notes?: string }`
- **Returns**: `{ entryId: Id<"exerciseEntries"> }`
- **Behavior**: resolves `exerciseName` through the catalog match-or-create path (FR-021); `order`
  is assigned internally (current max for this workout + 1, via `rules.ts`'s `nextEntryOrder`) —
  not client-specified; works regardless of `Workout.status` (FR-009a); calls
  `WorkoutRepository.touch` to bump `updatedAt`
- **Errors**: `ValidationError` if neither `strength` nor `interval` is provided

## `editEntry` (mutation)

Supports FR-008.

- **Args**: `{ entryId: Id<"exerciseEntries">; strength?: {...}; interval?: {...}; notes?: string }`
- **Returns**: `void`
- **Behavior**: partial update via `rules.ts`'s `applyEntryPatch`; works regardless of
  `Workout.status` (FR-009a); does not interrupt an active client-side timer (the client owns timer
  state, per research.md §1 — this mutation only persists the logged values); calls
  `WorkoutRepository.touch`
- **Errors**: `NotFound` if `entryId` doesn't exist

## `removeEntry` (mutation)

Supports FR-009.

- **Args**: `{ entryId: Id<"exerciseEntries"> }`
- **Returns**: `void`
- **Behavior**: deletes the row; does NOT re-sequence remaining entries' `order` (data-model.md —
  `order` is a sort key, not an addressable index); a workout MAY end up with zero entries — this
  is a valid state, not an error; calls `WorkoutRepository.touch`
- **Errors**: `NotFound` if `entryId` doesn't exist
