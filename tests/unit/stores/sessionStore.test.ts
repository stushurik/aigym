import { describe, expect, it } from "vitest";
import { useSessionStore } from "../../../src/stores/sessionStore";

describe("useSessionStore", () => {
  it("starts with no active workout", () => {
    expect(useSessionStore.getState().activeWorkoutId).toBeNull();
  });

  it("sets and clears the active workout id", () => {
    useSessionStore.getState().setActiveWorkoutId("workout-123");
    expect(useSessionStore.getState().activeWorkoutId).toBe("workout-123");

    useSessionStore.getState().setActiveWorkoutId(null);
    expect(useSessionStore.getState().activeWorkoutId).toBeNull();
  });
});
