# Data Model: AI Workout Tracker

Convex is document-based: each entity below is a Convex table (`convex/schema.ts`). Types are
expressed in TypeScript/Convex validator shorthand. Single-user v1 has no `userId` foreign keys —
every table implicitly belongs to the one local profile (per constitution's no-auth-in-v1
constraint); adding multi-user support later would add a `userId` field and index to each table,
which is out of scope now.

## Workout

Maps to spec **Workout** entity (FR-006–FR-009a, FR-013, FR-015).

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | Convex-assigned |
| `workoutType` | `"strength" \| "hiit" \| "cardio" \| "circuit"` | Drives UI rendering (FR-010); extensible enum — new values require a UI mapping before use (constitution Principle V) |
| `status` | `"draft" \| "in_progress" \| "completed"` | Does **not** restrict editability (FR-009a) — purely informational/history-list state |
| `source` | `"ai" \| "manual"` | Set at creation; retained for SC-002 measurement (edit-rate on AI-generated workouts) |
| `title` | `string` (optional) | User- or AI-provided label, e.g. "Upper Body Strength" |
| `entries` | `ExerciseEntry[]` | Ordered list, embedded (see below) |
| `chatConversationId` | `Id<"chatConversations">` (optional) | Set when `source === "ai"`, links back to the conversation that produced it |
| `createdAt` | `number` (ms epoch) | |
| `updatedAt` | `number` (ms epoch) | Bumped on every entry add/edit/remove |
| `completedAt` | `number` (ms epoch, optional) | Set when status transitions to `completed`; remains editable afterward per FR-009a |

**Validation rules**:
- `entries` MAY be empty (edge case: user removes every exercise) — an empty workout MUST NOT be
  presented as ready to run without explicit confirmation (UI-level rule, not a schema constraint).
- `workoutType` MUST be one of the defined enum values; introducing a new type is a schema +
  UI-mapping change together, never UI-only.

**State transitions**: `draft → in_progress → completed`, but transitions are advisory for display
only (e.g. "start workout" sets `in_progress`, "finish" sets `completed` + `completedAt`); no
transition is blocked by data-model rules, and any state MAY be edited (FR-009a). Backward
transitions (e.g. reopening a completed workout to `in_progress`) are permitted.

### ExerciseEntry (embedded in `Workout.entries`)

Maps to spec **Exercise Entry** entity (FR-007–FR-009, FR-010, FR-021).

| Field | Type | Notes |
|---|---|---|
| `exerciseCatalogId` | `Id<"exerciseCatalog">` | Never a free-text name (FR-021) |
| `order` | `number` | Sequence within the workout |
| `strength` | `{ sets: { targetReps?: number; reps?: number; weight?: number; completedAt?: number }[] }` (optional) | Present for rep/weight-driven entries |
| `interval` | `{ workSeconds: number; restSeconds: number; rounds: number; completedRounds?: number }` (optional) | Present for time-driven (HIIT/interval) entries |
| `notes` | `string` (optional) | Free-text user note on this entry only (not the exercise identity) |

**Validation rules**: at least one of `strength` / `interval` MUST be present, chosen based on the
parent `Workout.workoutType` (e.g. a `hiit` workout's entries use `interval`; a `strength`
workout's entries use `strength`) — this is what FR-010's type-adaptive UI renders against.

## ExerciseCatalog

Maps to spec **Exercise Catalog** entity (FR-021, research.md §4).

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | Referenced by `ExerciseEntry.exerciseCatalogId` |
| `name` | `string` | Canonical display name |
| `normalizedName` | `string` | Lowercased/whitespace-collapsed, indexed for exact-match lookup |
| `createdBy` | `"user" \| "ai"` | Which path introduced this entry |
| `createdAt` | `number` (ms epoch) | |

**Validation rules**: `normalizedName` MUST be unique (enforced via a Convex index + a
match-or-create mutation, per research.md §4) so the catalog never accumulates exact duplicates;
near-duplicates are reduced via fuzzy match at write time, not a hard schema constraint.

## ChatConversation

Maps to spec **Chat Conversation** entity (FR-001–FR-004, FR-019).

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | |
| `messages` | `{ role: "user" \| "assistant"; content: string; createdAt: number; proposedWorkout?: {...same shape as Workout.entries...} }[]` | Full negotiation history |
| `createdAt` | `number` (ms epoch) | |
| `updatedAt` | `number` (ms epoch) | |
| `resultingWorkoutId` | `Id<"workouts">` (optional) | Set once the user accepts a proposal (FR-006) |

**Validation rules**: an assistant message MUST contain either `content` alone (plain reply /
clarifying question, FR-004) or `content` + `proposedWorkout` (structured proposal, FR-001) — never
a workout proposal with no structured data, per constitution Principle I.

## UserPreferences

Maps to spec **User Preferences** entity (FR-003, FR-016, FR-019, FR-023). Singleton document
(single local profile, no auth in v1).

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | Single row for v1 |
| `goals` | `string[]` | e.g. `["strength", "fat loss"]` |
| `equipment` | `string[]` | Available equipment, free-text tags |
| `injuriesToAvoid` | `string[]` | Free-text injury/exercise-avoidance notes |
| `unitPreference` | `"kg" \| "lb"` | Defaults from locale at first run (spec Assumptions) |
| `aiDataNoticeAcknowledgedAt` | `number` (ms epoch, optional) | Set the first time the FR-019 notice is shown/acknowledged; `undefined` means not yet shown |
| `customApiKey` | `string` (optional) | Server-side only — MUST NOT be included in any client-readable query result (FR-023); see contracts/preferences.md |
| `updatedAt` | `number` (ms epoch) | |

**Validation rules**: `customApiKey`, if present, MUST only ever be read inside the Convex action
that calls Claude — no query exposed to the client returns this field (enforced by contract, not by
the schema type system).

## AiUsage

Supports FR-022/FR-023/SC-008 (research.md §5). Not a spec-named entity, but required to implement
the soft daily cap.

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | |
| `date` | `string` (`YYYY-MM-DD`) | Indexed, unique per day |
| `count` | `number` | Requests made against the app's default AI access on this date |

**Validation rules**: `count` is only incremented for requests that do **not** use a
`customApiKey` (FR-023's cap exemption). A missing row for today implies `count === 0`.

## Fatigue/Recovery Signal

Maps to spec **Fatigue/Recovery Signal** entity (Principle II, FR-005, SC-007). Not a stored table
— computed on read by a query over recent `Workout` documents (research.md §6): a decayed
volume × intensity estimate over a rolling window, returned as a value + qualitative band (e.g.
`"recovered" | "moderate" | "high"`) that the Claude action includes as prompt context.

## Entity Relationships

```
UserPreferences (singleton)
        │ (read as AI context)
        ▼
ChatConversation ──accepted──▶ Workout ──entries[]──▶ ExerciseEntry ──exerciseCatalogId──▶ ExerciseCatalog
        │                         ▲
        └── resultingWorkoutId ───┘

AiUsage (date-keyed counters, checked/incremented per default-access chat request)
Fatigue Signal (computed from Workout history, not stored)
```
