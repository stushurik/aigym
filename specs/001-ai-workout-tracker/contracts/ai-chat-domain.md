# Contract: AI Chat Domain (`src/domain/chat/`)

Added 2026-09-01 (constitution v1.2.1, Principles VII/VIII). This is the *domain* contract for the
AI Chat bounded context — the interfaces (`ports.ts`) `src/domain/chat/rules.ts` depends on, and
that `convex/chat/repository.ts`, `convex/chat/claudeAiChatProvider.ts`, and
`convex/chat/fatigueSignalProvider.ts` implement. See [`chat.md`](./chat.md) and
[`preferences.md`](./preferences.md) for the Convex-facing function surface, and
[`workout-tracking-domain.md`](./workout-tracking-domain.md) for the other bounded context.

## Ports (`src/domain/chat/ports.ts`)

```ts
interface ChatConversationRepository {
  get(id: ChatConversationId): Promise<ChatConversation | null>;
  create(): Promise<ChatConversationId>;
  appendMessage(id: ChatConversationId, message: ChatMessage): Promise<void>;
  setResultingWorkoutId(id: ChatConversationId, workoutId: string): Promise<void>; // opaque id, see data-model.md
}

interface AiChatProvider {
  // The ONLY interface allowed to know about the Claude API. Implemented by
  // convex/chat/claudeAiChatProvider.ts; never called directly from a Convex handler.
  generate(input: {
    messages: ChatMessage[];
    exerciseCatalog: { name: string }[];
    recentWorkoutSummary: string;
    fatigueSignal: FatigueSignal;
    preferences: PreferencesSnapshot;
  }): Promise<
    | { kind: "clarifying_question"; question: string }
    | { kind: "workout_proposal"; proposal: ProposalDraft }
    | { kind: "error"; reason: "ai_unreachable" }
  >;
}

interface FatigueSignalProvider {
  // Implemented by convex/chat/fatigueSignalProvider.ts, which reads through
  // WorkoutRepository (workout-tracking-domain.md) — never through this context's own tables.
  compute(): Promise<FatigueSignal>;
}

interface PreferencesRepository {
  get(): Promise<Preferences>;
  hasCustomApiKey(): Promise<boolean>;
  getCustomApiKeyForServerUseOnly(): Promise<string | null>; // never exposed outside convex/chat/*
}

interface AiUsagePolicy {
  // FR-022/FR-023/SC-008
  checkAndIncrementIfUsingDefaultAccess(usingCustomKey: boolean): Promise<{ allowed: boolean; remaining: number; resetsAt: number }>;
}
```

## Domain rules (`src/domain/chat/rules.ts`)

Pure orchestration logic that decides *what to do*, given already-fetched data — the ports above
handle *fetching* it; `convex/chat/functions.ts`'s `generateWorkout` action wires the two together
(research.md §7).

- `decideGenerationOutcome(input: { cap: { allowed: boolean }; providerResult: AiChatProvider... }): GenerationOutcome`
  — maps a cap-check + provider result into one of `clarifying_question` / `workout_proposal` /
  `error: "cap_reached"` / `error: "ai_unreachable"` (FR-004, FR-020, FR-022)
- `shouldShowAiDataNotice(preferences: Preferences): boolean` — FR-019, true iff
  `aiDataNoticeAcknowledgedAt` is unset
- `buildPromptContext(input: { messages, exerciseCatalog, recentWorkoutSummary, fatigueSignal, preferences }): PromptContext`
  — assembles the structured context object passed to `AiChatProvider.generate` (Principle I/II)

These are covered directly by `tests/unit/domain/chat/rules.test.ts` using fake port
implementations — no live Claude API call or Convex environment needed to test the cap/notice/
clarifying-question decision logic.

## The bounded-context boundary

`generateWorkout`'s `workout_proposal` outcome carries a `ProposalDraft` (this context's own DTO —
see data-model.md). `acceptProposal` (in `chat.md`) is the only place that DTO leaves this context:
it calls `src/domain/shared/translation.ts`'s `proposalToWorkoutDraft(proposal)` to get a
`WorkoutDraftInput`, then calls `WorkoutRepository.create` (the Workout Tracking context's own
port) — `src/domain/chat/*` never imports `src/domain/workoutTracking/types.ts` directly
(research.md §8).
