import { describe, expect, it } from "vitest";
import {
  applyEntryPatch,
  nextEntryOrder,
  nextStatus,
  validateEntry,
} from "../../../../src/domain/workoutTracking/rules";
import { ValidationError } from "../../../../src/domain/workoutTracking/types";
import type { ExerciseEntry } from "../../../../src/domain/workoutTracking/types";

describe("validateEntry", () => {
  it("accepts strength details for a strength workout", () => {
    expect(() =>
      validateEntry({ strength: { sets: [{ reps: 8, weight: 40 }] } }, "strength"),
    ).not.toThrow();
  });

  it("accepts interval details for a hiit workout", () => {
    expect(() =>
      validateEntry({ interval: { workSeconds: 30, restSeconds: 15, rounds: 8 } }, "hiit"),
    ).not.toThrow();
  });

  it("rejects an entry with neither strength nor interval", () => {
    expect(() => validateEntry({}, "strength")).toThrow(ValidationError);
  });

  it("rejects an entry with both strength and interval", () => {
    expect(() =>
      validateEntry(
        {
          strength: { sets: [] },
          interval: { workSeconds: 30, restSeconds: 15, rounds: 8 },
        },
        "strength",
      ),
    ).toThrow(ValidationError);
  });

  it("rejects strength details on a hiit workout", () => {
    expect(() => validateEntry({ strength: { sets: [] } }, "hiit")).toThrow(ValidationError);
  });

  it("rejects interval details on a strength workout", () => {
    expect(() =>
      validateEntry({ interval: { workSeconds: 30, restSeconds: 15, rounds: 8 } }, "strength"),
    ).toThrow(ValidationError);
  });
});

describe("nextEntryOrder", () => {
  it("returns 0 for an empty workout", () => {
    expect(nextEntryOrder([])).toBe(0);
  });

  it("returns max(order) + 1", () => {
    expect(nextEntryOrder([{ order: 0 }, { order: 2 }, { order: 1 }])).toBe(3);
  });
});

describe("applyEntryPatch", () => {
  const strengthEntry: ExerciseEntry = {
    id: "entry-1",
    workoutId: "workout-1",
    exerciseCatalogId: "exercise-1",
    order: 0,
    strength: { sets: [{ reps: 8, weight: 40 }] },
  };

  it("merges new set values into a strength entry", () => {
    const updated = applyEntryPatch(strengthEntry, {
      strength: { sets: [{ reps: 10, weight: 42.5 }] },
    });
    expect(updated.strength).toEqual({ sets: [{ reps: 10, weight: 42.5 }] });
  });

  it("preserves fields not present in the patch", () => {
    const updated = applyEntryPatch(strengthEntry, { notes: "felt easy" });
    expect(updated.strength).toEqual(strengthEntry.strength);
    expect(updated.notes).toBe("felt easy");
  });

  it("rejects switching a strength entry to interval details", () => {
    expect(() =>
      applyEntryPatch(strengthEntry, {
        interval: { workSeconds: 30, restSeconds: 15, rounds: 8 },
      }),
    ).toThrow(ValidationError);
  });
});

describe("nextStatus", () => {
  it("sets completedAt when transitioning to completed", () => {
    expect(nextStatus("completed", 1000)).toEqual({ status: "completed", completedAt: 1000 });
  });

  it("clears completedAt for any non-completed transition", () => {
    expect(nextStatus("in_progress", 1000)).toEqual({ status: "in_progress", completedAt: null });
    expect(nextStatus("draft", 1000)).toEqual({ status: "draft", completedAt: null });
  });
});
