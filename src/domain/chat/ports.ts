/**
 * AI Chat bounded context — ports (constitution Principle VII).
 */

import type {
  ChatConversationId,
  ChatMessage,
  FatigueSignal,
  GenerationOutcome,
  Preferences,
} from "./types";

export interface ChatConversationRepository {
  create(): Promise<ChatConversationId>;
  get(
    id: ChatConversationId,
  ): Promise<{ id: ChatConversationId; resultingWorkoutId: string | null } | null>;
  listMessages(id: ChatConversationId): Promise<ChatMessage[]>;
  /** Saves the user's message and returns its id, to anchor the later generate() call (FR-001/US1). */
  appendUserMessage(id: ChatConversationId, content: string): Promise<{ messageId: string }>;
  /** Opaque string — Workout Tracking's typed Id is not known to this context (Principle VIII). */
  setResultingWorkoutId(id: ChatConversationId, workoutId: string): Promise<void>;
}

export interface AiChatProvider {
  /** The ONLY interface allowed to know about the Claude API / AI SDK. */
  generate(input: {
    threadId: ChatConversationId;
    /** The message id returned by ChatConversationRepository.appendUserMessage — anchors the generation to that turn. */
    promptMessageId: string;
    systemContext: string;
    /** Present when the caller has a custom key configured (FR-023) — bypasses the app default. */
    apiKeyOverride?: string;
  }): Promise<GenerationOutcome>;
}

export interface FatigueSignalProvider {
  /** Reads through Workout Tracking's own WorkoutRepository, never that context's Convex tables directly (Principle VIII). */
  compute(now: number): Promise<{ fatigueSignal: FatigueSignal; recentWorkoutSummary: string }>;
}

export interface PreferencesRepository {
  get(): Promise<Preferences>;
  hasCustomApiKey(): Promise<boolean>;
  /** Never exposed outside the AI Chat context's infrastructure (FR-023). */
  getCustomApiKeyForServerUseOnly(): Promise<string | null>;
}

export interface AiUsagePolicy {
  /** FR-022/FR-023/SC-008. `usingCustomKey` requests are never counted against the cap. */
  checkAndIncrementIfUsingDefaultAccess(
    usingCustomKey: boolean,
  ): Promise<{ allowed: boolean; remaining: number; resetsAt: number }>;
}
