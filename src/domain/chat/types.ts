/**
 * AI Chat bounded context — domain types (constitution Principle VIII).
 * No Convex/AI-SDK imports here. A "Chat Conversation" (the constitution's canonical
 * term — never "CoachingSession") is backed by a Convex Agent component thread;
 * `ChatConversationId` below is that thread's id, treated as an opaque string.
 */

export type ChatConversationId = string;
export type WorkoutType = "strength" | "hiit" | "cardio" | "circuit";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

export interface ProposalDraftEntry {
  exerciseName: string;
  strength?: { sets: { targetReps?: number; reps?: number; weight?: number }[] };
  interval?: { workSeconds: number; restSeconds: number; rounds: number };
  notes?: string;
}

/** The AI Chat context's own DTO for a proposed workout — NOT a Workout Tracking type. */
export interface ProposalDraft {
  workoutType: WorkoutType;
  title?: string;
  entries: ProposalDraftEntry[];
}

export type FatigueBand = "recovered" | "moderate" | "high";

export interface FatigueSignal {
  band: FatigueBand;
  score: number;
}

/** A workout reduced to just what the fatigue calculation needs (research.md §6). */
export interface WorkoutVolumeSample {
  occurredAt: number;
  workoutType: WorkoutType;
  /** Arbitrary volume unit — see computeFatigueSignal for how it's derived and weighted. */
  volume: number;
}

export interface Preferences {
  goals: string[];
  equipment: string[];
  injuriesToAvoid: string[];
  unitPreference: "kg" | "lb";
  aiDataNoticeAcknowledgedAt: number | null;
}

export type GenerationOutcome =
  | { kind: "clarifying_question"; question: string }
  | { kind: "workout_proposal"; proposal: ProposalDraft }
  | { kind: "error"; reason: "ai_unreachable" | "cap_reached" };
