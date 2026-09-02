import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexPreferencesRepository } from "./repository";

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const repository = new ConvexPreferencesRepository(ctx);
    const [preferences, hasCustomApiKey] = await Promise.all([
      repository.get(),
      repository.hasCustomApiKey(),
    ]);
    // customApiKey itself is never included here (FR-023) — only the derived boolean.
    return { ...preferences, hasCustomApiKey };
  },
});

export const updatePreferences = mutation({
  args: {
    goals: v.optional(v.array(v.string())),
    equipment: v.optional(v.array(v.string())),
    injuriesToAvoid: v.optional(v.array(v.string())),
    unitPreference: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const repository = new ConvexPreferencesRepository(ctx);
    await repository.update(args);
    return null;
  },
});

export const acknowledgeAiDataNotice = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const repository = new ConvexPreferencesRepository(ctx);
    await repository.update({ aiDataNoticeAcknowledgedAt: Date.now() });
    return null;
  },
});

export const setCustomApiKey = mutation({
  args: { apiKey: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.apiKey !== null && args.apiKey.trim().length === 0) {
      throw new Error("apiKey must not be an empty string");
    }
    const repository = new ConvexPreferencesRepository(ctx);
    await repository.update({ customApiKey: args.apiKey });
    return null;
  },
});
