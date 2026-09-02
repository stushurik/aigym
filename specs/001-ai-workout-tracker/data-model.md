# Data Model: AI Workout Tracker

Revised 2026-09-01 against constitution v1.2.1 (Principles VII/VIII): entities are now grouped by
bounded context — **Workout Tracking** and **AI Chat** — each with its own domain types in
`src/domain/<context>/types.ts`, persisted through that context's own Convex tables. The two
contexts share no internal type; where one context's data becomes the other's input, that crosses
through the explicit translation boundary in `src/domain/shared/translation.ts` (research.md §8) or
through a narrow read port (`FatigueSignalProvider`, research.md §6/§7) — never by importing each
other's types directly.

Convex is document-based: each entity below is a Convex table. Single-user v1 has no `userId`
foreign keys — every table implicitly belongs to the one local profile (per constitution's
no-auth-in-v1 constraint); adding multi-user support later would add a `userId` field and index to
each table, which is out of scope now.

## Bounded Context: Workout Tracking

Owns everything about a logged/in-progress workout's structure. Domain types in
`src/domain/workoutTracking/types.ts`; persisted via `convex/workoutTracking/schema.ts`; only
reachable from outside through `src/domain/workoutTracking/ports.ts`
(`WorkoutRepository`, `ExerciseCatalogRepository`).

### Workout

Maps to spec **Workout** entity (FR-006–FR-009a, FR-013, FR-015).

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | Convex-assigned |
| `workoutType` | `"strength" \| "hiit" \| "cardio" \| "circuit"` | Drives UI rendering (FR-010); extensible enum — new values require a UI mapping before use (constitution Principle V) |
| `status` | `"draft" \| "in_progress" \| "completed"` | Does **not** restrict editability (FR-009a) — purely informational/history-list state |
| `source` | `"ai" \| "manual"` | Set at creation; retained for SC-002 measurement (edit-rate on AI-generated workouts) |
| `title` | `string` (optional) | User- or AI-provided label, e.g. "Upper Body Strength" |
| `entries` | `ExerciseEntry[]` | Ordered list, embedded (see below) |
| `originatingChatConversationId` | `string` (optional) | Opaque id string, not a typed reference into the AI Chat context — set when `source === "ai"`. Deliberately untyped here: Workout Tracking does not depend on the AI Chat context's `ChatConversation` type (Principle VIII); the AI Chat context is free to resolve this id back to its own `ChatConversation` if needed |
| `createdAt` | `number` (ms epoch) | |
| `updatedAt` | `number` (ms epoch) | Bumped on every entry add/edit/remove |
| `completedAt` | `number` (ms epoch, optional) | Set when status transitions to `completed`; remains editable afterward per FR-009a |

**Validation rules** (enforced in `src/domain/workoutTracking/rules.ts`, not in Convex handlers):
- `entries` MAY be empty (edge case: user removes every exercise) — an empty workout MUST NOT be
  presented as ready to run without explicit confirmation (UI-level rule, not a domain-layer
  constraint).
- `workoutType` MUST be one of the defined enum values; introducing a new type is a schema +
  UI-mapping change together, never UI-only.

**State transitions**: `draft → in_progress → completed`, but transitions are advisory for display
only (e.g. "start workout" sets `in_progress`, "finish" sets `completed` + `completedAt`); no
transition is blocked by domain rules, and any state MAY be edited (FR-009a). Backward transitions
(e.g. reopening a completed workout to `in_progress`) are permitted.

### ExerciseEntry (embedded in `Workout.entries`)

Maps to spec **Exercise Entry** entity (FR-007–FR-009, FR-010, FR-021). Kept as its own term
(distinct from the canonical "Exercise" and "Set") because it represents a third, genuinely
different concept — an exercise's *occurrence within this specific workout* (with its own order and
logged values) — not the exercise's catalog identity (`Exercise`) or an individual logged set
(`Set`, nested inside `strength.sets` below).

| Field | Type | Notes |
|---|---|---|
| `exerciseCatalogId` | `Id<"exerciseCatalog">` | References the canonical **Exercise** identity; never a free-text name (FR-021) |
| `order` | `number` | Sequence within the workout |
| `strength` | `{ sets: Set[] }` (optional) | Present for rep/weight-driven entries |
| `interval` | `{ workSeconds: number; restSeconds: number; rounds: number; completedRounds?: number }` (optional) | Present for time-driven (HIIT/interval) entries |
| `notes` | `string` (optional) | Free-text user note on this entry only (not the exercise identity) |

**Set** (nested in `strength.sets`, the canonical term for one logged/target rep-weight pair):

| Field | Type | Notes |
|---|---|---|
| `targetReps` | `number` (optional) | |
| `reps` | `number` (optional) | Actual logged reps |
| `weight` | `number` (optional) | |
| `completedAt` | `number` (ms epoch, optional) | |

**Validation rules**: at least one of `strength` / `interval` MUST be present, chosen based on the
parent `Workout.workoutType` (e.g. a `hiit` workout's entries use `interval`; a `strength`
workout's entries use `strength`) — this is what FR-010's type-adaptive UI renders against.

### Exercise (Convex table name: `exerciseCatalog`)

Maps to spec **Exercise Catalog** entity (FR-021, research.md §4). The canonical term for this
concept is **Exercise**; the Convex table is named `exerciseCatalog` to distinguish "the catalog of
known Exercises" from an `ExerciseEntry`'s reference into it — no separate "Exercise Catalog"
domain type exists beyond this table.

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | Referenced by `ExerciseEntry.exerciseCatalogId` |
| `name` | `string` | Canonical display name |
| `normalizedName` | `string` | Lowercased/whitespace-collapsed, indexed for exact-match lookup |
| `createdBy` | `"user" \| "ai"` | Which path introduced this entry |
| `createdAt` | `number` (ms epoch) | |

**Validation rules**: `normalizedName` MUST be unique (enforced via a Convex index + a
match-or-create domain rule, per research.md §4) so the catalog never accumulates exact
duplicates; near-duplicates are reduced via fuzzy match at write time, not a hard schema
constraint.

## Bounded Context: AI Chat

Owns the conversational negotiation of a workout and the AI-usage-cap/BYOK mechanics. Domain types
in `src/domain/chat/types.ts`; persisted via `convex/chat/schema.ts`; only reachable from outside
through `src/domain/chat/ports.ts` (`ChatConversationRepository`, `AiChatProvider`,
`FatigueSignalProvider`, `PreferencesRepository`, `AiUsagePolicy`).

### Chat Conversation

Maps to spec **Chat Conversation** entity (FR-001–FR-004, FR-019) — this is the constitution's
canonical term (Principle VIII); it is **not** called "CoachingSession" anywhere in code, docs, or
conversation.

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | |
| `messages` | `ChatMessage[]` | Full negotiation history |
| `createdAt` | `number` (ms epoch) | |
| `updatedAt` | `number` (ms epoch) | |
| `resultingWorkoutId` | `string` (optional) | Opaque id string pointing into the Workout Tracking context's `Workout` table — deliberately untyped here for the same reason as `Workout.originatingChatConversationId` above (Principle VIII); set once the user accepts a proposal (FR-006) via `src/domain/shared/translation.ts` |

**ChatMessage** (nested in `messages`):

| Field | Type | Notes |
|---|---|---|
| `role` | `"user" \| "assistant"` | |
| `content` | `string` | |
| `createdAt` | `number` (ms epoch) | |
| `proposedWorkout` | `ProposalDraft` (optional) | The AI Chat context's own DTO for a proposed workout — see below; only `src/domain/shared/translation.ts` converts this into a Workout Tracking type |

**ProposalDraft** (the AI Chat context's own shape — not a `Workout`):

| Field | Type | Notes |
|---|---|---|
| `workoutType` | `"strength" \| "hiit" \| "cardio" \| "circuit"` | Mirrors Workout Tracking's enum by value, not by shared type reference |
| `title` | `string` (optional) | |
| `entries` | `{ exerciseName: string; order: number; strength?: {...}; interval?: {...}; notes?: string }[]` | Uses `exerciseName` (a string), not an `exerciseCatalogId` — catalog resolution happens on the Workout Tracking side when `translation.ts` calls `createWorkout`, keeping the AI Chat context from needing to know about `exerciseCatalog` identity resolution |

**Validation rules**: an assistant message MUST contain either `content` alone (plain reply /
clarifying question, FR-004) or `content` + `proposedWorkout` (structured proposal, FR-001) — never
a workout proposal with no structured data, per constitution Principle I.

### AiUsage

Supports FR-022/FR-023/SC-008 (research.md §5). Owned by the AI Chat context — it meters AI Chat
context requests, not Workout Tracking activity.

| Field | Type | Notes |
|---|---|---|
| `_id` | Id | |
| `date` | `string` (`YYYY-MM-DD`) | Indexed, unique per day |
| `count` | `number` | Requests made against the app's default AI access on this date |

**Validation rules**: `count` is only incremented for requests that do **not** use a
`customApiKey` (FR-023's cap exemption). A missing row for today implies `count === 0`.

### Fatigue/Recovery Signal

Maps to spec **Fatigue/Recovery Signal** entity (Principle II, FR-005, SC-007). Not a stored table
— computed on read (research.md §6) by the `FatigueSignalProvider` port's Convex implementation,
which reads recent `Workout` documents through `WorkoutRepository` (Workout Tracking's own port),
never by the AI Chat context reaching into Workout Tracking's Convex table directly. Returned as a
value + qualitative band (e.g. `"recovered" | "moderate" | "high"`) that the `ClaudeAiChatProvider`
includes as prompt context.

## Supporting Subdomain: Preferences

`UserPreferences` (goals, equipment, injuries, unit preference, AI data-notice acknowledgment,
custom API key, singleton document) is shared, read-mostly configuration data consumed by the AI
Chat context (as prompt input and for the BYOK/cap mechanics) and editable from the UI regardless
of context. It is small enough that splitting it into its own bounded context would be ceremony,
not clarity (Principle VIII's explicit exception) — it lives in `convex/preferences/schema.ts` with
its own `PreferencesRepository` port (declared in `src/domain/chat/ports.ts`, since the AI Chat
context is its only *domain-logic* consumer; the UI reads/writes it directly through Convex
queries/mutations without going through a domain rule).

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

**Validation rules**: `customApiKey`, if present, MUST only ever be read inside the
`ClaudeAiChatProvider` adapter — no query exposed to the client returns this field (enforced by
contract, not by the schema type system).

## Entity Relationships

```
Bounded Context: Workout Tracking              Bounded Context: AI Chat
┌───────────────────────────────┐              ┌──────────────────────────────────┐
│ Exercise (exerciseCatalog)     │◀─┐           │ ChatConversation                  │
│                                 │  │           │  └─ messages[].proposedWorkout    │
│ Workout                        │  │           │       (ProposalDraft, own shape)  │
│  └─ entries[] (ExerciseEntry)  │  │           │                                    │
│       └─ exerciseCatalogId ────┼──┘           │ AiUsage (date-keyed counters)      │
└───────────────────────────────┘              └──────────────────────────────────┘
        ▲                                                        │
        │  src/domain/shared/translation.ts                      │
        │  (ProposalDraft → WorkoutDraftInput; entries[].          │
        │   exerciseName resolved to exerciseCatalogId here)       │
        └────────────────────────────────────────────────────────┘
        ▲
        │  FatigueSignalProvider port (read-only, via WorkoutRepository)
        └──────────────────────────────────────────── (consumed by AI Chat context)

Supporting: UserPreferences (singleton) — read by AI Chat context as prompt input; edited directly via UI
```
