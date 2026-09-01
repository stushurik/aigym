# Contract: Exercise Catalog (`convex/exerciseCatalog.ts`)

Supports FR-021 and research.md §4. Types reference [`../data-model.md`](../data-model.md).

## `searchCatalog` (query)

Used for manual-entry autocomplete (User Story 3) and to build the Claude action's catalog
context (Chat contract).

- **Args**: `{ query: string; limit?: number }` (default `limit`: 20)
- **Returns**: `{ _id, name }[]`, ranked by normalized-name prefix/fuzzy match
- **Errors**: none

## `resolveOrCreate` (mutation, internal — called by `workouts.ts` and `chat.ts`, not directly by the client)

Implements the single identity rule from FR-021 and research.md §4.

- **Args**: `{ name: string }`
- **Returns**: `{ exerciseCatalogId: Id<"exerciseCatalog">; created: boolean }`
- **Behavior**:
  1. Normalize `name` (lowercase, collapse whitespace).
  2. Exact match on `normalizedName` → return existing id.
  3. No exact match → fuzzy match under the configured distance threshold → return existing id if
     found.
  4. No match at all → insert a new catalog row (`createdBy` set by the caller: `"user"` from
     manual entry, `"ai"` from the chat action) and return the new id.
- **Errors**: none (always resolves to an id)
