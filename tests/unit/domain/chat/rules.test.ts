import { describe, expect, it } from "vitest";
import {
  buildPromptContext,
  computeFatigueSignal,
  decideGenerationOutcome,
  shouldShowAiDataNotice,
  summarizeRecentWorkouts,
} from "../../../../src/domain/chat/rules";
import type { Preferences } from "../../../../src/domain/chat/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const basePreferences: Preferences = {
  goals: [],
  equipment: [],
  injuriesToAvoid: [],
  unitPreference: "kg",
  aiDataNoticeAcknowledgedAt: null,
};

describe("shouldShowAiDataNotice", () => {
  it("is true when the notice has never been acknowledged", () => {
    expect(shouldShowAiDataNotice(basePreferences)).toBe(true);
  });

  it("is false once acknowledged", () => {
    expect(shouldShowAiDataNotice({ ...basePreferences, aiDataNoticeAcknowledgedAt: 1000 })).toBe(
      false,
    );
  });
});

describe("decideGenerationOutcome", () => {
  it("short-circuits to cap_reached without needing a provider result", () => {
    expect(decideGenerationOutcome({ allowed: false }, undefined)).toEqual({
      kind: "error",
      reason: "cap_reached",
    });
  });

  it("passes the provider result through when the cap allows generation", () => {
    const providerResult = {
      kind: "clarifying_question",
      question: "Which muscle groups?",
    } as const;
    expect(decideGenerationOutcome({ allowed: true }, providerResult)).toBe(providerResult);
  });

  it("throws if the cap allows generation but no provider result was supplied", () => {
    expect(() => decideGenerationOutcome({ allowed: true }, undefined)).toThrow();
  });
});

describe("buildPromptContext", () => {
  it("includes the fatigue band, recent history, and preferences", () => {
    const context = buildPromptContext({
      recentWorkoutSummary: "3 strength sessions in the last 7 days.",
      fatigueSignal: { band: "high", score: 0.82 },
      preferences: {
        goals: ["strength"],
        equipment: ["dumbbells"],
        injuriesToAvoid: ["shoulder"],
        unitPreference: "lb",
        aiDataNoticeAcknowledgedAt: 1000,
      },
    });

    expect(context).toContain("3 strength sessions in the last 7 days.");
    expect(context).toContain("high (score 0.82)");
    expect(context).toContain("Goals: strength.");
    expect(context).toContain("Available equipment: dumbbells.");
    expect(context).toContain("Injuries/exercises to avoid: shoulder.");
    expect(context).toContain("Preferred units: lb.");
  });

  it("falls back to plain language when there is no history, and unit preference always appears", () => {
    const context = buildPromptContext({
      recentWorkoutSummary: "",
      fatigueSignal: { band: "recovered", score: 0 },
      preferences: basePreferences,
    });

    expect(context).toContain("No workouts logged yet.");
    expect(context).toContain("Preferred units: kg.");
    expect(context).not.toContain("Goals:");
    expect(context).not.toContain("Available equipment:");
    expect(context).not.toContain("Injuries/exercises to avoid:");
  });
});

describe("computeFatigueSignal", () => {
  const now = 1_000_000_000;

  it("returns recovered with a zero score for no recent training", () => {
    expect(computeFatigueSignal([], now)).toEqual({ band: "recovered", score: 0 });
  });

  it("returns a high band for a lot of very recent volume", () => {
    const samples = Array.from({ length: 5 }, () => ({
      occurredAt: now - DAY_MS,
      workoutType: "strength" as const,
      volume: 2000,
    }));
    const result = computeFatigueSignal(samples, now);
    expect(result.band).toBe("high");
    expect(result.score).toBeGreaterThan(1.5);
  });

  it("decays older volume so it contributes less than the same volume today", () => {
    const recent = computeFatigueSignal(
      [{ occurredAt: now, workoutType: "strength", volume: 1000 }],
      now,
    );
    const old = computeFatigueSignal(
      [{ occurredAt: now - 21 * DAY_MS, workoutType: "strength", volume: 1000 }],
      now,
    );
    expect(old.score).toBeLessThan(recent.score);
  });
});

describe("summarizeRecentWorkouts", () => {
  const now = 1_000_000_000;

  it("returns an empty string when there is no history at all", () => {
    expect(summarizeRecentWorkouts([], now)).toBe("");
  });

  it("notes when nothing was logged in the last 14 days but history exists", () => {
    const summary = summarizeRecentWorkouts(
      [{ occurredAt: now - 30 * DAY_MS, workoutType: "strength" }],
      now,
    );
    expect(summary).toContain("No workouts logged in the last 14 days");
  });

  it("summarizes counts by workout type within the last 14 days", () => {
    const summary = summarizeRecentWorkouts(
      [
        { occurredAt: now - DAY_MS, workoutType: "strength" },
        { occurredAt: now - 2 * DAY_MS, workoutType: "strength" },
        { occurredAt: now - 3 * DAY_MS, workoutType: "hiit" },
        { occurredAt: now - 30 * DAY_MS, workoutType: "cardio" },
      ],
      now,
    );
    expect(summary).toContain("3 workout(s) in the last 14 days");
    expect(summary).toContain("2 strength");
    expect(summary).toContain("1 hiit");
    expect(summary).not.toContain("cardio");
  });
});
