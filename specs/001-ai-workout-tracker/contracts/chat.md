# Contract: AI Chat (`convex/chat.ts`)

Supports FR-001–FR-006, FR-019, FR-020, FR-022, FR-023 and research.md §3, §5. Types reference
[`../data-model.md`](../data-model.md).

## `getConversation` (query)

- **Args**: `{ chatConversationId: Id<"chatConversations"> }`
- **Returns**: full `ChatConversation` document (message history)
- **Errors**: `NotFound`

## `postMessage` (mutation)

Appends the user's message and returns immediately (optimistic UI); the AI reply is produced by
`generateWorkout` (below), invoked by the client right after.

- **Args**: `{ chatConversationId?: Id<"chatConversations">; content: string }`
- **Returns**: `{ chatConversationId: Id<"chatConversations"> }` (creates a new conversation if none given)
- **Errors**: `ValidationError` if `content` is empty

## `generateWorkout` (action — the only function in this contract set that calls the Claude API)

Implements Principle I/II/III end to end for a single chat turn.

- **Args**: `{ chatConversationId: Id<"chatConversations"> }`
- **Returns** (discriminated union):
  - `{ kind: "clarifying_question"; question: string }` — Principle III / FR-004
  - `{ kind: "workout_proposal"; workoutType: WorkoutType; title?: string; entries: ExerciseEntryInput[] }` — Principle I / FR-001
  - `{ kind: "error"; reason: "ai_unreachable" | "cap_reached" }` — FR-020, FR-022
- **Behavior**:
  1. Check `preferences.customApiKey`; if absent, call `aiUsage.checkAndIncrementDailyCap` — if the
     cap is already reached, return `{ kind: "error", reason: "cap_reached" }` without calling
     Claude (FR-022, SC-008).
  2. If `preferences.aiDataNoticeAcknowledgedAt` is unset, the client is expected to have shown the
     FR-019 notice and recorded acknowledgment *before* invoking this action (this action assumes
     acknowledgment already happened — it does not gate on it itself, to keep the notice a pure
     client-side UX step per FR-019's "one-time notice" framing).
  3. Build the Claude request: conversation history (`ChatConversation.messages`), recent workout
     summary + fatigue signal (Principle II), stated preferences (Principle III context), and the
     current exercise catalog (research.md §4) — as a structured tool/JSON-schema call.
  4. On a Claude API failure/timeout, append no assistant message and return
     `{ kind: "error", reason: "ai_unreachable" }` (FR-020) — no automatic retry.
  5. On success, append the assistant message (with `proposedWorkout` if the model returned one)
     and return the corresponding `kind`.
- **Errors**: none thrown to the client — failure modes are represented in the `kind: "error"`
  return value so the chat UI can render them inline, per FR-020's "clear error message" + resume
  path.

## `acceptProposal` (mutation)

Implements FR-006.

- **Args**: `{ chatConversationId: Id<"chatConversations">; messageIndex: number }`
- **Returns**: `{ workoutId: Id<"workouts"> }`
- **Behavior**: reads the `proposedWorkout` at `messageIndex`, calls `workouts.createWorkout` with
  `source: "ai"` and `chatConversationId` set, then sets `ChatConversation.resultingWorkoutId`
- **Errors**: `ValidationError` if the referenced message has no `proposedWorkout`
