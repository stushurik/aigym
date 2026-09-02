# Contract: Workout Tracking Domain (`src/domain/workoutTracking/`)

Added 2026-09-01 (constitution v1.2.1, Principles VII/VIII); revised 2026-09-02 once
`convex/_generated/ai/guidelines.md` became available (linked Convex deployment) and flagged the
original embedded-`entries[]`-array design as violating Convex's own unbounded-array guidance —
`exerciseEntries` is now its own table addressed by `_id`, not an array index (see data-model.md).
This is the *domain* contract — the interfaces (`ports.ts`) that
`src/domain/workoutTracking/rules.ts` depends on, and that `convex/workoutTracking/repository.ts`
implements. Domain code here has zero import of Convex APIs; these signatures are plain
TypeScript, testable with hand-written fakes in `tests/unit/domain/`. See
[`workouts.md`](./workouts.md) and [`exercise-catalog.md`](./exercise-catalog.md) for the
Convex-facing function surface that wraps this domain layer.

## Ports (`src/domain/workoutTracking/ports.ts`)

```ts
interface WorkoutRepository {
  get(workoutId: WorkoutId): Promise<Workout | null>;
  list(): Promise<WorkoutSummary[]>;
  create(input: WorkoutDraftInput): Promise<WorkoutId>; // creates the Workout row (entries created separately, see ExerciseEntryRepository)
  setStatus(workoutId: WorkoutId, status: WorkoutStatus): Promise<void>;
  touch(workoutId: WorkoutId): Promise<void>; // bumps updatedAt — called after any entry add/edit/remove
}

interface ExerciseEntryRepository {
  listByWorkout(workoutId: WorkoutId): Promise<ExerciseEntry[]>; // ordered by `order`, via the by_workoutId_and_order index — no in-memory sort
  add(workoutId: WorkoutId, exerciseCatalogId: ExerciseId, input: EntryInput): Promise<ExerciseEntryId>; // `order` is assigned internally as current-max + 1
  edit(entryId: ExerciseEntryId, patch: EntryPatch): Promise<void>;
  remove(entryId: ExerciseEntryId): Promise<void>; // does NOT re-sequence remaining entries' `order` — see data-model.md
}

interface ExerciseCatalogRepository {
  search(query: string, limit?: number): Promise<{ id: ExerciseId; name: string }[]>;
  resolveOrCreate(name: string, createdBy: "user" | "ai"): Promise<{ id: ExerciseId; created: boolean }>;
}
```

`convex/workoutTracking/repository.ts` provides `ConvexWorkoutRepository` /
`ConvexExerciseEntryRepository` / `ConvexExerciseCatalogRepository` implementations of these
interfaces, each constructed with the Convex `QueryCtx`/`MutationCtx` at the top of a
query/mutation handler in `convex/workoutTracking/functions.ts`. (Per Convex's guidelines, `ctx.db`
is unavailable in actions — nothing in this bounded context is called from an action in this PR, so
that constraint doesn't yet apply here; it matters once the AI Chat context's `generateWorkout`
action needs read access to recent workouts for the fatigue signal, handled via `ctx.runQuery` to
an `internalQuery` in that PR.)

## Domain rules (`src/domain/workoutTracking/rules.ts`)

Pure functions — no I/O, no `Promise`, no port dependency.

- `validateEntry(input: EntryInput, workoutType: WorkoutType): void` — throws `ValidationError` if
  neither `strength` nor `interval` is present, or the wrong one is present for `workoutType`
  (FR-010)
- `nextEntryOrder(existingEntries: { order: number }[]): number` — `existingEntries` empty → `0`,
  otherwise `max(order) + 1`; used by `ExerciseEntryRepository.add`'s implementation
- `applyEntryPatch(entry: ExerciseEntry, patch: EntryPatch): ExerciseEntry` — merges a partial edit
  (FR-008), re-validated against the entry's own type fields (can't flip `strength`↔`interval` via
  a patch — that would need remove + add)
- `nextStatus(current: WorkoutStatus, target: WorkoutStatus): { status: WorkoutStatus; completedAt: number | null }`
  — sets `completedAt` to `Date.now()`-supplied-by-caller when transitioning to `completed`, clears
  it otherwise; never throws (any transition is valid, FR-009a)

These are the functions covered directly by `tests/unit/domain/workoutTracking/rules.test.ts`
(Principle VII: "pure domain-logic modules get direct Vitest unit coverage with no Convex test
harness needed"). `tests/unit/domain/workoutTracking/rules.test.ts` fakes the ports where a test
needs repository behavior (e.g. `nextEntryOrder` against a fake `listByWorkout` result) rather than
hitting Convex.
