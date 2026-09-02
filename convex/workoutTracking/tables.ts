import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Workout Tracking bounded context's table definitions (constitution Principle VIII).
 * Convex only supports one schema.ts for the whole deployment, so this module exports
 * table definitions that convex/schema.ts spreads into defineSchema(), rather than
 * defining its own schema.
 */

export const setValidator = v.object({
  targetReps: v.optional(v.number()),
  reps: v.optional(v.number()),
  weight: v.optional(v.number()),
  completedAt: v.optional(v.number()),
});

export const strengthValidator = v.object({
  sets: v.array(setValidator),
});

export const intervalValidator = v.object({
  workSeconds: v.number(),
  restSeconds: v.number(),
  rounds: v.number(),
  completedRounds: v.optional(v.number()),
});

export const workoutTypeValidator = v.union(
  v.literal("strength"),
  v.literal("hiit"),
  v.literal("cardio"),
  v.literal("circuit"),
);

export const workoutStatusValidator = v.union(
  v.literal("draft"),
  v.literal("in_progress"),
  v.literal("completed"),
);

export const workoutSourceValidator = v.union(v.literal("ai"), v.literal("manual"));

export const workoutTrackingTables = {
  workouts: defineTable({
    workoutType: workoutTypeValidator,
    status: workoutStatusValidator,
    source: workoutSourceValidator,
    title: v.optional(v.string()),
    // Opaque string, not v.id("chatConversations") — Workout Tracking does not
    // depend on the AI Chat context's types (constitution Principle VIII).
    originatingChatConversationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }),

  exerciseEntries: defineTable({
    workoutId: v.id("workouts"),
    exerciseCatalogId: v.id("exerciseCatalog"),
    order: v.number(),
    strength: v.optional(strengthValidator),
    interval: v.optional(intervalValidator),
    notes: v.optional(v.string()),
  }).index("by_workoutId_and_order", ["workoutId", "order"]),

  exerciseCatalog: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    createdBy: v.union(v.literal("user"), v.literal("ai")),
    createdAt: v.number(),
  }).index("by_normalizedName", ["normalizedName"]),
};
