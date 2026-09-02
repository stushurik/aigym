# Contract: Exercise Catalog (`convex/workoutTracking/functions.ts`)

Supports FR-021 and research.md §4. Part of the Workout Tracking bounded context (the canonical
term for this concept is **Exercise**; see [`workout-tracking-domain.md`](./workout-tracking-domain.md)
for the underlying `ExerciseCatalogRepository` port). Types reference
[`../data-model.md`](../data-model.md).

## `searchCatalog` (query)

Used for manual-entry autocomplete (User Story 3) and to build the Claude action's catalog
context (Chat contract).

- **Args**: `{ query: string; limit?: number }` (default `limit`: 20)
- **Returns**: `{ _id, name }[]`, ranked by normalized-name prefix/fuzzy match
- **Errors**: none

## `resolveOrCreate` (mutation, internal — implements `ExerciseCatalogRepository.resolveOrCreate`; called from `workoutTracking/functions.ts`'s `createWorkout`/`addEntry` handlers and, via `src/domain/shared/translation.ts`, from `chat.ts`'s `acceptProposal` — never directly by the client)

Implements the single identity rule from FR-021 and research.md §4.

- **Args**: `{ name: string; createdBy: "user" | "ai" }`
- **Returns**: `{ exerciseCatalogId: Id<"exerciseCatalog">; created: boolean }`
- **Behavior**:
  1. Normalize `name` (lowercase, collapse whitespace).
  2. Exact match on `normalizedName` → return existing id.
  3. No exact match → fuzzy match under the configured distance threshold → return existing id if
     found.
  4. No match at all → insert a new catalog row with the given `createdBy` and return the new id.
- **Errors**: none (always resolves to an id)
