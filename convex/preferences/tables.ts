import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Preferences supporting subdomain (data-model.md) — shared, read-mostly
 * configuration consumed by the AI Chat context and edited directly from the UI.
 * Small enough that a full bounded context would be ceremony, not clarity
 * (constitution Principle VIII's explicit exception).
 */

export const preferencesTables = {
  userPreferences: defineTable({
    goals: v.array(v.string()),
    equipment: v.array(v.string()),
    injuriesToAvoid: v.array(v.string()),
    unitPreference: v.union(v.literal("kg"), v.literal("lb")),
    aiDataNoticeAcknowledgedAt: v.optional(v.number()),
    // Server-side only (FR-023) — never returned by any query. See
    // convex/preferences/functions.ts's getPreferences.
    customApiKey: v.optional(v.string()),
    updatedAt: v.number(),
  }),
};
