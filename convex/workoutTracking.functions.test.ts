// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("workoutTracking functions", () => {
  test("manual workout creation, editing, and removal round-trips through Convex", async () => {
    const t = convexTest(schema, modules);

    const { workoutId } = await t.mutation(api.workoutTracking.functions.createWorkout, {
      workoutType: "strength",
      title: "Upper Body",
      source: "manual",
      entries: [
        {
          exerciseName: "Bench Press",
          strength: { sets: [{ targetReps: 8, weight: 60 }] },
        },
      ],
    });

    const withEntries = await t.query(api.workoutTracking.functions.getWorkoutWithEntries, {
      workoutId,
    });
    expect(withEntries.workout.title).toBe("Upper Body");
    expect(withEntries.entries).toHaveLength(1);
    expect(withEntries.entries[0].exerciseName).toBe("Bench Press");
    expect(withEntries.entries[0].strength).toEqual({ sets: [{ targetReps: 8, weight: 60 }] });

    const { entryId } = await t.mutation(api.workoutTracking.functions.addEntry, {
      workoutId,
      exerciseName: "bench press",
      strength: { sets: [{ targetReps: 5, weight: 65 }] },
    });

    const afterAdd = await t.query(api.workoutTracking.functions.getWorkoutWithEntries, {
      workoutId,
    });
    expect(afterAdd.entries).toHaveLength(2);
    // "bench press" (lowercase) must resolve to the same catalog entry as "Bench Press" (FR-021).
    expect(afterAdd.entries[0].exerciseCatalogId).toBe(afterAdd.entries[1].exerciseCatalogId);

    await t.mutation(api.workoutTracking.functions.editEntry, {
      entryId,
      strength: { sets: [{ targetReps: 5, weight: 67.5 }] },
    });
    const afterEdit = await t.query(api.workoutTracking.functions.getWorkoutWithEntries, {
      workoutId,
    });
    expect(afterEdit.entries[1].strength).toEqual({ sets: [{ targetReps: 5, weight: 67.5 }] });

    await t.mutation(api.workoutTracking.functions.removeEntry, { entryId });
    const afterRemove = await t.query(api.workoutTracking.functions.getWorkoutWithEntries, {
      workoutId,
    });
    expect(afterRemove.entries).toHaveLength(1);

    await t.mutation(api.workoutTracking.functions.updateWorkoutStatus, {
      workoutId,
      status: "completed",
    });
    const completed = await t.query(api.workoutTracking.functions.getWorkoutWithEntries, {
      workoutId,
    });
    expect(completed.workout.status).toBe("completed");
    expect(completed.workout.completedAt).not.toBeNull();

    // FR-009a: a completed workout is still fully editable.
    await t.mutation(api.workoutTracking.functions.addEntry, {
      workoutId,
      exerciseName: "Overhead Press",
      strength: { sets: [{ targetReps: 6, weight: 30 }] },
    });
    const afterCompletedEdit = await t.query(api.workoutTracking.functions.getWorkoutWithEntries, {
      workoutId,
    });
    expect(afterCompletedEdit.entries).toHaveLength(2);
  });

  test("listWorkouts paginates newest-first and searchCatalog matches by prefix", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.workoutTracking.functions.createWorkout, {
      workoutType: "hiit",
      source: "manual",
      entries: [
        {
          exerciseName: "Burpees",
          interval: { workSeconds: 30, restSeconds: 15, rounds: 8 },
        },
      ],
    });
    await t.mutation(api.workoutTracking.functions.createWorkout, {
      workoutType: "strength",
      source: "manual",
      entries: [{ exerciseName: "Squat", strength: { sets: [{ targetReps: 5, weight: 80 }] } }],
    });

    const page = await t.query(api.workoutTracking.functions.listWorkouts, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(2);
    expect(page.page[0].workoutType).toBe("strength"); // created second -> newest first

    const results = await t.query(api.workoutTracking.functions.searchCatalog, {
      query: "sq",
    });
    expect(results.map((r) => r.name)).toEqual(["Squat"]);
  });

  test("createWorkout rejects an entry that doesn't match its workout type", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.workoutTracking.functions.createWorkout, {
        workoutType: "strength",
        source: "manual",
        entries: [
          {
            exerciseName: "Sprint Intervals",
            interval: { workSeconds: 20, restSeconds: 10, rounds: 6 },
          },
        ],
      }),
    ).rejects.toThrow();
  });
});
