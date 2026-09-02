# Contract: AI Chat (`convex/chat/functions.ts`)

Supports FR-001–FR-006, FR-019, FR-020, FR-022, FR-023 and research.md §3, §5, §7, §8. Types
reference [`../data-model.md`](../data-model.md). Each handler here is a thin wrapper composing
`src/domain/chat/ports.ts` adapters and calling `src/domain/chat/rules.ts` — see
[`ai-chat-domain.md`](./ai-chat-domain.md) for those signatures. This module never imports
`src/domain/workoutTracking/types.ts` directly (Principle VIII) — `acceptProposal` crosses that
boundary only through `src/domain/shared/translation.ts`.

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

## `generateWorkout` (action — the only Convex function that constructs `ClaudeAiChatProvider`)

Implements Principle I/II/III end to end for a single chat turn by composing the ports from
`ai-chat-domain.md` and delegating the decision logic to `src/domain/chat/rules.ts`'s
`decideGenerationOutcome`.

- **Args**: `{ chatConversationId: Id<"chatConversations"> }`
- **Returns** (discriminated union — `GenerationOutcome` from `rules.ts`):
  - `{ kind: "clarifying_question"; question: string }` — Principle III / FR-004
  - `{ kind: "workout_proposal"; proposal: ProposalDraft }` — Principle I / FR-001 (`ProposalDraft`
    is the AI Chat context's own shape, not a `Workout` — see data-model.md)
  - `{ kind: "error"; reason: "ai_unreachable" | "cap_reached" }` — FR-020, FR-022
- **Behavior**:
  1. Construct `ConvexPreferencesRepository`, `ConvexAiUsagePolicy`, `ClaudeAiChatProvider`,
     `ConvexFatigueSignalProvider` (which itself is constructed with a `WorkoutRepository` — see
     `workout-tracking-domain.md`), and `ConvexChatConversationRepository`.
  2. Call `AiUsagePolicy.checkAndIncrementIfUsingDefaultAccess` — if not `allowed`, return
     `rules.ts`'s cap-reached outcome without calling `AiChatProvider.generate` (FR-022, SC-008).
  3. If `preferences.aiDataNoticeAcknowledgedAt` is unset, the client is expected to have shown the
     FR-019 notice and recorded acknowledgment *before* invoking this action (this action assumes
     acknowledgment already happened — it does not gate on it itself, to keep the notice a pure
     client-side UX step per FR-019's "one-time notice" framing).
  4. Call `rules.ts`'s `buildPromptContext`, then `AiChatProvider.generate` with it.
  5. Call `rules.ts`'s `decideGenerationOutcome` to turn the provider result into the return value
     above; on success, append the assistant message via `ChatConversationRepository.appendMessage`.
- **Errors**: none thrown to the client — failure modes are represented in the `kind: "error"`
  return value so the chat UI can render them inline, per FR-020's "clear error message" + resume
  path.

## `acceptProposal` (mutation — the bounded-context boundary crossing)

Implements FR-006.

- **Args**: `{ chatConversationId: Id<"chatConversations">; messageIndex: number }`
- **Returns**: `{ workoutId: Id<"workouts"> }`
- **Behavior**:
  1. Read the `proposedWorkout` (`ProposalDraft`) at `messageIndex` via
     `ChatConversationRepository`.
  2. Call `src/domain/shared/translation.ts`'s `proposalToWorkoutDraft(proposal)` to get a
     `WorkoutDraftInput` (research.md §8) — this is the only step in this whole module that touches
     a Workout Tracking type.
  3. Call `workoutTracking/functions.ts`'s `createWorkout` (see `workouts.md`) with `source: "ai"`
     and `originatingChatConversationId` set to this conversation's id (as an opaque string).
  4. Call `ChatConversationRepository.setResultingWorkoutId`.
- **Errors**: `ValidationError` if the referenced message has no `proposedWorkout`
