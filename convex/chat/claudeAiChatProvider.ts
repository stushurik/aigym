import { Agent } from "@convex-dev/agent";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { AiChatProvider } from "../../src/domain/chat/ports";
import type { GenerationOutcome, WorkoutType } from "../../src/domain/chat/types";
import { components } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { env } from "../_generated/server";

// Reviewed 2026-09-02. Override via the ANTHROPIC_MODEL env var (convex env set)
// to move to a newer snapshot without a code change.
const DEFAULT_MODEL_ID = "claude-sonnet-4-5-20250929";
const AGENT_NAME = "aigym-workout-chat";

const SYSTEM_INSTRUCTIONS = [
  "You are the AI chat inside AIGYM, a workout tracking app. Your job is to help the",
  "user build a workout by proposing specific exercises grounded in their recent",
  "training history, their current fatigue/recovery signal, and their stated",
  "preferences (constitution Principles I & II).",
  "If the request is ambiguous or missing information that would materially change",
  "the resulting workout (e.g. no indication of available equipment or intensity),",
  'respond with kind: "clarifying_question" instead of guessing (Principle III).',
  "Never propose an exercise that conflicts with a stated injury/avoidance preference —",
  "substitute or decline instead.",
].join(" ");

const workoutTypeSchema = z.enum(["strength", "hiit", "cardio", "circuit"]);

const proposalEntrySchema = z.object({
  exerciseName: z.string(),
  strength: z
    .object({
      sets: z.array(
        z.object({
          targetReps: z.number().optional(),
          reps: z.number().optional(),
          weight: z.number().optional(),
        }),
      ),
    })
    .optional(),
  interval: z
    .object({
      workSeconds: z.number(),
      restSeconds: z.number(),
      rounds: z.number(),
    })
    .optional(),
  notes: z.string().optional(),
});

const generationResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("clarifying_question"), question: z.string() }),
  z.object({
    kind: z.literal("workout_proposal"),
    workoutType: workoutTypeSchema,
    title: z.string().optional(),
    entries: z.array(proposalEntrySchema),
  }),
]);

/**
 * The ONLY module that calls the Claude API (constitution Platform & Technology
 * Constraints, research.md §3). Backed by @convex-dev/agent's Agent.generateObject
 * for structured output — never a hand-rolled prompt/parse loop.
 */
export class ClaudeAiChatProvider implements AiChatProvider {
  constructor(private ctx: ActionCtx) {}

  async generate(input: {
    threadId: string;
    promptMessageId: string;
    systemContext: string;
    apiKeyOverride?: string;
  }): Promise<GenerationOutcome> {
    const apiKey = input.apiKeyOverride ?? env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { kind: "error", reason: "ai_unreachable" };
    }

    const modelId = env.ANTHROPIC_MODEL ?? DEFAULT_MODEL_ID;
    const languageModel = createAnthropic({ apiKey })(modelId);
    const agent = new Agent(components.agent, {
      name: AGENT_NAME,
      languageModel,
      instructions: SYSTEM_INSTRUCTIONS,
    });

    try {
      const result = await agent.generateObject(
        this.ctx,
        { threadId: input.threadId },
        {
          schema: generationResultSchema,
          system: input.systemContext,
          promptMessageId: input.promptMessageId,
        },
      );
      return toGenerationOutcome(result.object);
    } catch {
      return { kind: "error", reason: "ai_unreachable" };
    }
  }
}

function toGenerationOutcome(object: z.infer<typeof generationResultSchema>): GenerationOutcome {
  if (object.kind === "clarifying_question") {
    return { kind: "clarifying_question", question: object.question };
  }
  return {
    kind: "workout_proposal",
    proposal: {
      workoutType: object.workoutType as WorkoutType,
      title: object.title,
      entries: object.entries,
    },
  };
}
