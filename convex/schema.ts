import { defineSchema } from "convex/server";
import { chatTables } from "./chat/tables";
import { preferencesTables } from "./preferences/tables";
import { workoutTrackingTables } from "./workoutTracking/tables";

// Convex supports exactly one schema per deployment. Each bounded context
// (constitution Principle VIII) exports its own table definitions from a
// `tables.ts` alongside its schema/repository/functions; this file is only
// the merge point.
export default defineSchema({
  ...workoutTrackingTables,
  ...chatTables,
  ...preferencesTables,
});
