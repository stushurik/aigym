import { create } from "zustand";

/**
 * Client-only UI state for the currently active workout session (which
 * workout is open, whether a timer is running). This is deliberately
 * separate from server data (Convex/TanStack Query) — see plan.md's
 * Project Structure: "Zustand: active timer/session UI state (not
 * persisted server data)". Timer-specific state lands here once
 * src/lib/timer.ts exists (research.md §1).
 */
interface SessionState {
  activeWorkoutId: string | null;
  setActiveWorkoutId: (workoutId: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeWorkoutId: null,
  setActiveWorkoutId: (workoutId) => set({ activeWorkoutId: workoutId }),
}));
