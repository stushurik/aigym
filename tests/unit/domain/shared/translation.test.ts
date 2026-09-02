import { describe, expect, it } from "vitest";
import { proposalToWorkoutDraft } from "../../../../src/domain/shared/translation";
import type { ProposalDraft } from "../../../../src/domain/chat/types";

describe("proposalToWorkoutDraft", () => {
  it("maps a strength proposal's fields across the bounded-context boundary", () => {
    const proposal: ProposalDraft = {
      workoutType: "strength",
      title: "Upper Body",
      entries: [
        {
          exerciseName: "Bench Press",
          strength: { sets: [{ targetReps: 8, weight: 60 }] },
          notes: "Focus on control",
        },
      ],
    };

    expect(proposalToWorkoutDraft(proposal)).toEqual({
      workoutType: "strength",
      title: "Upper Body",
      entries: [
        {
          exerciseName: "Bench Press",
          strength: { sets: [{ targetReps: 8, weight: 60 }] },
          interval: undefined,
          notes: "Focus on control",
        },
      ],
    });
  });

  it("maps a hiit proposal's interval entries", () => {
    const proposal: ProposalDraft = {
      workoutType: "hiit",
      entries: [
        { exerciseName: "Burpees", interval: { workSeconds: 30, restSeconds: 15, rounds: 8 } },
      ],
    };

    const result = proposalToWorkoutDraft(proposal);
    expect(result.workoutType).toBe("hiit");
    expect(result.entries[0].interval).toEqual({ workSeconds: 30, restSeconds: 15, rounds: 8 });
    expect(result.entries[0].strength).toBeUndefined();
  });
});
