# Contract: Workout Tracking Domain (`src/domain/workoutTracking/`)

Added 2026-09-01 (constitution v1.2.1, Principles VII/VIII). This is the *domain* contract — the
interfaces (`ports.ts`) that `src/domain/workoutTracking/rules.ts` depends on, and that
`convex/workoutTracking/repository.ts` implements. Domain code here has zero import of Convex APIs;
these signatures are plain TypeScript, testable with hand-written fakes in `tests/unit/domain/`.
See [`workouts.md`](./workouts.md) and [`exercise-catalog.md`](./exercise-catalog.md) for the
Convex-facing function surface that wraps this domain layer.

## Ports (`src/domain/workoutTracking/ports.ts`)

```ts
interface WorkoutRepository {
  get(workoutId: WorkoutId): Promise<Workout | null>;
  list(): Promise<WorkoutSummary[]>;
  recentWorkoutsSince(sinceMs: number): Promise<Workout[]>; // used by FatigueSignalProvider (ai-chat-domain.md)
  create(input: WorkoutDraftInput): Promise<WorkoutId>;
  save(workout: Workout): Promise<void>; // full replace after a rules.ts mutation, e.g. addEntry
}

interface ExerciseCatalogRepository {
  search(query: string, limit?: number): Promise<{ id: ExerciseId; name: string }[]>;
  resolveOrCreate(name: string, createdBy: "user" | "ai"): Promise<{ id: ExerciseId; created: boolean }>;
}
```

`convex/workoutTracking/repository.ts` provides `ConvexWorkoutRepository` /
`ConvexExerciseCatalogRepository` implementations of these interfaces, each constructed with the
Convex `ctx` at the top of a query/mutation handler in `convex/workoutTracking/functions.ts`.

## Domain rules (`src/domain/workoutTracking/rules.ts`)

Pure functions — no I/O, no `Promise`, no port dependency — operating on an already-loaded
`Workout` (or building a new one). `convex/workoutTracking/functions.ts` handlers load/save via the
ports above and call these functions in between.

- `addEntry(workout: Workout, exerciseCatalogId: ExerciseId, input: EntryInput): Workout` — FR-007;
  appends and re-sequences `order`
- `editEntry(workout: Workout, entryIndex: number, patch: EntryPatch): Workout` — FR-008; throws
  `EntryNotFoundError` if out of range
- `removeEntry(workout: Workout, entryIndex: number): Workout` — FR-009; re-sequences remaining
  `order` values; a resulting empty `entries: []` is valid, not an error
- `setStatus(workout: Workout, status: WorkoutStatus): Workout` — sets `completedAt` on transition
  to `completed`; never blocks any transition (FR-009a)
- `validateEntry(entry: ExerciseEntryInput, workoutType: WorkoutType): void` — throws
  `ValidationError` if neither `strength` nor `interval` is present, or the wrong one is present
  for `workoutType`

These are the functions covered directly by `tests/unit/domain/workoutTracking/rules.test.ts`
(Principle VII: "pure domain-logic modules get direct Vitest unit coverage with no Convex test
harness needed").
