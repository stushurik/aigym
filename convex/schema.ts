import { defineSchema } from "convex/server";
import { workoutTrackingTables } from "./workoutTracking/tables";

// Convex supports exactly one schema per deployment. Each bounded context
// (constitution Principle VIII) exports its own table definitions from a
// `tables.ts` alongside its schema/repository/functions; this file is only
// the merge point. The AI Chat context's tables land in the next PR.
export default defineSchema({
  ...workoutTrackingTables,
});
