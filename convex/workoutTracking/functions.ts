import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  applyEntryPatch,
  nextEntryOrder,
  nextStatus,
  validateEntry,
} from "../../src/domain/workoutTracking/rules";
import type { EntryInput } from "../../src/domain/workoutTracking/types";
import type { Id } from "../_generated/dataModel";
import { internalQuery, mutation, query } from "../_generated/server";
import {
  ConvexExerciseCatalogRepository,
  ConvexExerciseEntryRepository,
  ConvexWorkoutRepository,
} from "./repository";
import { intervalValidator, strengthValidator, workoutTypeValidator } from "./tables";

const entryFieldsValidator = {
  strength: v.optional(strengthValidator),
  interval: v.optional(intervalValidator),
  notes: v.optional(v.string()),
};

export const listWorkouts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const repository = new ConvexWorkoutRepository(ctx);
    return await repository.list(args.paginationOpts);
  },
});

export const getWorkoutWithEntries = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const workoutRepository = new ConvexWorkoutRepository(ctx);
    const entryRepository = new ConvexExerciseEntryRepository(ctx);
    const catalogRepository = new ConvexExerciseCatalogRepository(ctx);

    const workout = await workoutRepository.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    const entries = await entryRepository.listByWorkout(args.workoutId);
    const entriesWithNames = await Promise.all(
      entries.map(async (entry) => {
        const exercise = await catalogRepository.getById(entry.exerciseCatalogId);
        return { ...entry, exerciseName: exercise?.name ?? "" };
      }),
    );

    return { workout, entries: entriesWithNames };
  },
});

export const searchCatalog = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const repository = new ConvexExerciseCatalogRepository(ctx);
    return await repository.search(args.query, args.limit);
  },
});

export const createWorkout = mutation({
  args: {
    workoutType: workoutTypeValidator,
    title: v.optional(v.string()),
    source: v.union(v.literal("ai"), v.literal("manual")),
    entries: v.array(v.object({ exerciseName: v.string(), ...entryFieldsValidator })),
    originatingChatConversationId: v.optional(v.string()),
  },
  returns: v.object({ workoutId: v.id("workouts") }),
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      validateEntry(entry, args.workoutType);
    }

    const workoutRepository = new ConvexWorkoutRepository(ctx);
    const entryRepository = new ConvexExerciseEntryRepository(ctx);
    const catalogRepository = new ConvexExerciseCatalogRepository(ctx);

    const workoutId = await workoutRepository.create({
      workoutType: args.workoutType,
      title: args.title,
      source: args.source,
      originatingChatConversationId: args.originatingChatConversationId,
    });

    let order = 0;
    for (const entry of args.entries) {
      const { id: exerciseCatalogId } = await catalogRepository.resolveOrCreate(
        entry.exerciseName,
        args.source === "ai" ? "ai" : "user",
      );
      const entryInput: EntryInput = {
        strength: entry.strength,
        interval: entry.interval,
        notes: entry.notes,
      };
      await entryRepository.add(workoutId, exerciseCatalogId, entryInput, order);
      order += 1;
    }

    return { workoutId: workoutId as Id<"workouts"> };
  },
});

export const updateWorkoutStatus = mutation({
  args: {
    workoutId: v.id("workouts"),
    status: v.union(v.literal("draft"), v.literal("in_progress"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const repository = new ConvexWorkoutRepository(ctx);
    const existing = await repository.get(args.workoutId);
    if (!existing) {
      throw new Error("Workout not found");
    }
    const { status, completedAt } = nextStatus(args.status, Date.now());
    await repository.setStatus(args.workoutId, status, completedAt);
  },
});

export const addEntry = mutation({
  args: { workoutId: v.id("workouts"), exerciseName: v.string(), ...entryFieldsValidator },
  returns: v.object({ entryId: v.id("exerciseEntries") }),
  handler: async (ctx, args) => {
    const workoutRepository = new ConvexWorkoutRepository(ctx);
    const entryRepository = new ConvexExerciseEntryRepository(ctx);
    const catalogRepository = new ConvexExerciseCatalogRepository(ctx);

    const workout = await workoutRepository.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    const entryInput: EntryInput = {
      strength: args.strength,
      interval: args.interval,
      notes: args.notes,
    };
    validateEntry(entryInput, workout.workoutType);

    const { id: exerciseCatalogId } = await catalogRepository.resolveOrCreate(
      args.exerciseName,
      "user",
    );
    const existingEntries = await entryRepository.listByWorkout(args.workoutId);
    const order = nextEntryOrder(existingEntries);
    const entryId = await entryRepository.add(args.workoutId, exerciseCatalogId, entryInput, order);
    await workoutRepository.touch(args.workoutId);

    return { entryId: entryId as Id<"exerciseEntries"> };
  },
});

export const editEntry = mutation({
  args: { entryId: v.id("exerciseEntries"), ...entryFieldsValidator },
  handler: async (ctx, args) => {
    const entryRepository = new ConvexExerciseEntryRepository(ctx);
    const workoutRepository = new ConvexWorkoutRepository(ctx);

    const entry = await entryRepository.get(args.entryId);
    if (!entry) {
      throw new Error("Exercise entry not found");
    }

    const patched = applyEntryPatch(entry, {
      strength: args.strength,
      interval: args.interval,
      notes: args.notes,
    });
    await entryRepository.edit(args.entryId, {
      strength: patched.strength,
      interval: patched.interval,
      notes: patched.notes,
    });
    await workoutRepository.touch(entry.workoutId);
  },
});

export const removeEntry = mutation({
  args: { entryId: v.id("exerciseEntries") },
  handler: async (ctx, args) => {
    const entryRepository = new ConvexExerciseEntryRepository(ctx);
    const workoutRepository = new ConvexWorkoutRepository(ctx);

    const entry = await entryRepository.get(args.entryId);
    if (!entry) {
      throw new Error("Exercise entry not found");
    }

    await entryRepository.remove(args.entryId);
    await workoutRepository.touch(entry.workoutId);
  },
});

/**
 * Bounded, read-only projection for the AI Chat context's fatigue-signal
 * calculation (research.md §6-8). Deliberately generic (no "volume"/fatigue
 * semantics here — that's the AI Chat context's own concern, computed in
 * convex/chat/fatigueSignalProvider.ts) so Workout Tracking doesn't need to
 * know why this data is being read. Internal because actions can't reach
 * ctx.db directly and must go through ctx.runQuery (Principle VII).
 */
export const recentWorkoutsWithEntries = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const workouts = await ctx.db.query("workouts").order("desc").take(args.limit);
    return await Promise.all(
      workouts.map(async (workout) => {
        const entries = await ctx.db
          .query("exerciseEntries")
          .withIndex("by_workoutId_and_order", (q) => q.eq("workoutId", workout._id))
          .collect();
        return {
          workoutType: workout.workoutType,
          createdAt: workout.createdAt,
          entries: entries.map((entry) => ({ strength: entry.strength, interval: entry.interval })),
        };
      }),
    );
  },
});
