import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * AI Chat bounded context's table definitions (constitution Principle VIII).
 * The conversation's messages themselves are NOT a table here — they're owned by
 * the mounted @convex-dev/agent component (per Convex's guidelines: never
 * hand-roll a messages table for an LLM-backed conversation). `chatSessions` is
 * only the thin app-level link from an Agent thread to the Workout Tracking
 * context, which the Agent component's own thread metadata doesn't carry.
 */

export const chatTables = {
  chatSessions: defineTable({
    threadId: v.string(),
    // Opaque string, not v.id("workouts") — the AI Chat context does not
    // depend on the Workout Tracking context's types (Principle VIII).
    resultingWorkoutId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_threadId", ["threadId"]),

  aiUsage: defineTable({
    date: v.string(), // YYYY-MM-DD
    count: v.number(),
  }).index("by_date", ["date"]),
};
