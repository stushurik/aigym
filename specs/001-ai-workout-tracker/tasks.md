---
description: "Task list template for feature implementation"
---

# Tasks: AI Workout Tracker

**Input**: Design documents from `/specs/001-ai-workout-tracker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Included. The constitution's Development Workflow & Quality Gates mandate Vitest +
React Testing Library coverage for component/unit changes and a Playwright smoke suite for
changes touching a core user flow (chat-to-workout, workout execution, timers) — every user story
here touches at least one such flow, so each story phase includes its test tasks.

**Organization**: Tasks are grouped by user story (from spec.md, priority order P1 → P1 → P2 → P2
→ P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single repo, Convex-backed React PWA (per plan.md Structure Decision): `convex/` for backend
functions/schema, `src/` for the frontend, `tests/unit/` and `tests/e2e/` for tests.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic tooling

- [ ] T001 Initialize the pnpm workspace: `package.json`, strict `tsconfig.json`, and Vite config for React 19 at repo root
- [ ] T002 Initialize the Convex project (`npx convex init`), producing `convex.json` and wiring `ConvexProvider` into `src/main.tsx`
- [ ] T003 [P] Configure Biome lint/format in `biome.json` and add `pnpm lint` / `pnpm format` scripts to `package.json`
- [ ] T004 [P] Configure `vite-plugin-pwa` + Workbox in `vite.config.ts` (manifest fields, icon set in `public/icons/`, base caching strategy) per research.md §2
- [ ] T005 [P] Configure Vitest + React Testing Library: `vitest.config.ts` and `tests/unit/setup.ts`
- [ ] T006 [P] Configure Playwright: `playwright.config.ts` and a base fixture in `tests/e2e/fixtures.ts`
- [ ] T007 Set up the TanStack Router route tree skeleton in `src/routes/` (root layout + empty route files for chat, workout detail, history, preferences) and a TanStack Query client wrapping the Convex client in `src/main.tsx`
- [ ] T008 [P] Set up the Zustand store skeleton for client-only session/timer UI state in `src/stores/sessionStore.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data model and backend/frontend infrastructure every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Define the Convex schema in `convex/schema.ts` for `workouts`, `exerciseCatalog`, `chatConversations`, `userPreferences`, `aiUsage` per data-model.md, including the `normalizedName` index on `exerciseCatalog`
- [ ] T010 [P] Implement `searchCatalog` and `resolveOrCreate` in `convex/exerciseCatalog.ts` per contracts/exercise-catalog.md and research.md §4 (normalized exact match, then fuzzy-match threshold, then create) — depends on T009
- [ ] T011 [P] Implement `getPreferences`, `updatePreferences`, `acknowledgeAiDataNotice`, `setCustomApiKey` in `convex/preferences.ts` per contracts/preferences.md, ensuring `customApiKey` is never returned by any query — depends on T009
- [ ] T012 [P] Implement `checkAndIncrementDailyCap` in `convex/aiUsage.ts` per contracts/preferences.md and research.md §5 — depends on T009
- [ ] T013 [P] Implement the `computeFatigueSignal` query in `convex/fatigue.ts` per research.md §6 (decayed volume × intensity over recent `workouts`) — depends on T009
- [ ] T014 Implement `listWorkouts`, `getWorkout`, `createWorkout`, `updateWorkoutStatus`, `addEntry`, `editEntry`, `removeEntry` in `convex/workouts.ts` per contracts/workouts.md, using `exerciseCatalog.resolveOrCreate` for entry names — depends on T009, T010
- [ ] T015 [P] Implement the wall-clock timer utility in `src/lib/timer.ts` (`targetEndTime`-based countdown, Page Visibility recompute-on-focus) per research.md §1
- [ ] T016 [P] Implement the offline persisted query cache in `src/lib/offlineCache.ts` (TanStack Query + IndexedDB persister) per research.md §2
- [ ] T017 [P] Implement the unit-preference/locale-default helper in `src/lib/units.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Build a Workout Through AI Chat (Priority: P1) 🎯 MVP

**Goal**: A user describes a workout need in chat and receives a structured AI proposal (or a
clarifying question) grounded in their history, fatigue signal, and preferences, and can accept it
into an editable workout.

**Independent Test**: Open the chat, enter a workout request, and confirm the AI returns a
structured set of exercises that becomes available as an editable workout.

### Tests for User Story 1

- [ ] T018 [P] [US1] Component test for chat message list + composer rendering (user/assistant messages, clarifying-question state) in `tests/unit/components/chat/ChatView.test.tsx`
- [ ] T019 [P] [US1] Playwright e2e test covering quickstart.md scenario 1 (structured proposal, ambiguous-request clarifying question, accept-into-workout) in `tests/e2e/chat.spec.ts`

### Implementation for User Story 1

- [ ] T020 [P] [US1] Implement `postMessage` mutation in `convex/chat.ts` per contracts/chat.md — depends on T009
- [ ] T021 [US1] Implement the `generateWorkout` action in `convex/chat.ts` (cap check, Claude structured tool-use call with history/fatigue/preferences/catalog context, `clarifying_question`/`workout_proposal`/`error` return kinds) per contracts/chat.md and research.md §3, §5 — depends on T010, T011, T012, T013, T020
- [ ] T022 [US1] Implement `acceptProposal` mutation in `convex/chat.ts` per contracts/chat.md — depends on T014, T021
- [ ] T023 [P] [US1] Build the one-time AI-data-notice modal in `src/components/chat/AiDataNotice.tsx` (FR-019) — depends on T011
- [ ] T024 [P] [US1] Build the chat message list and composer in `src/components/chat/ChatView.tsx` and `src/components/chat/ChatComposer.tsx`
- [ ] T025 [US1] Build the proposed-workout preview with accept/discard controls in `src/components/chat/ProposedWorkoutPreview.tsx` — depends on T024
- [ ] T026 [US1] Wire the chat route in `src/routes/chat.tsx` using TanStack Query hooks over `postMessage`/`generateWorkout`/`acceptProposal` — depends on T020, T021, T022, T023, T024, T025
- [ ] T027 [US1] Implement clarifying-question and error-state (`ai_unreachable`, `cap_reached`) rendering in `ChatView`, with manual-retry and build-it-yourself fallback affordances (FR-004, FR-020, FR-022) — depends on T026
- [ ] T028 [US1] Add a "configure your own API key" link from the `cap_reached` error state to the preferences route (FR-023) — depends on T027

**Checkpoint**: User Story 1 fully functional and independently testable

---

## Phase 4: User Story 2 - Run a Workout With a Type-Adaptive UI (Priority: P1)

**Goal**: A user opens any workout and sees the controls appropriate to its type — rep/weight entry
for strength, work/rest interval timers for HIIT — with timers that stay accurate through
backgrounding.

**Independent Test**: Open a strength-type workout and confirm rep/weight controls appear; open a
HIIT-type workout and confirm interval timers appear instead; background a running timer and
confirm it resumes with correct time.

### Tests for User Story 2

- [ ] T029 [P] [US2] Unit test for the wall-clock timer utility's drift/recompute-on-focus behavior in `tests/unit/lib/timer.test.ts`
- [ ] T030 [P] [US2] Component test asserting strength vs. interval controls render per `workoutType` in `tests/unit/components/workout/WorkoutView.test.tsx`
- [ ] T031 [P] [US2] Playwright e2e test covering quickstart.md scenario 2 (type-adaptive controls, timer accuracy across a simulated backgrounding event) in `tests/e2e/workout-execution.spec.ts`

### Implementation for User Story 2

- [ ] T032 [P] [US2] Build the strength entry component (per-set reps/weight fields) in `src/components/workout/StrengthEntry.tsx`
- [ ] T033 [P] [US2] Build the interval entry + timer component (work/rest countdown, start/pause/reset) in `src/components/workout/IntervalTimer.tsx` — depends on T015
- [ ] T034 [US2] Build the `WorkoutView` container that selects `StrengthEntry`/`IntervalEntry` per `workoutType` in `src/components/workout/WorkoutView.tsx` — depends on T032, T033
- [ ] T035 [US2] Wire the workout detail route in `src/routes/workout.$workoutId.tsx` using `getWorkout` and `updateWorkoutStatus` — depends on T014, T034
- [ ] T036 [US2] Implement background interval-boundary notifications via the service worker Notification API, invoked from `src/lib/timer.ts` — depends on T004, T015
- [ ] T037 [US2] Implement Wake Lock request/release during an active timer in `IntervalTimer.tsx` — depends on T033

**Checkpoint**: User Stories 1 AND 2 both independently functional

---

## Phase 5: User Story 3 - Edit and Manage Workout Entries (Priority: P2)

**Goal**: A user can add, edit, and remove any exercise entry on any workout — AI-generated,
manual, or already completed.

**Independent Test**: On any existing workout, add a new entry, edit an existing entry's values,
and remove a different entry, confirming each change persists after navigating away and back.

### Tests for User Story 3

- [ ] T038 [P] [US3] Component test for add/edit/remove entry flows, including the empty-workout state, in `tests/unit/components/workout/EntryEditor.test.tsx`
- [ ] T039 [P] [US3] Playwright e2e test covering quickstart.md scenario 3 (add with near-duplicate name resolving to the same catalog entry, edit, remove, persistence) in `tests/e2e/edit-entries.spec.ts`

### Implementation for User Story 3

- [ ] T040 [P] [US3] Build an exercise-name autocomplete input backed by `searchCatalog` in `src/components/workout/ExerciseAutocomplete.tsx` — depends on T010
- [ ] T041 [US3] Build the add-entry form (type-appropriate fields based on parent `workoutType`) in `src/components/workout/AddEntryForm.tsx` — depends on T040
- [ ] T042 [US3] Build inline edit/remove controls per entry in `src/components/workout/EntryEditor.tsx` — depends on T032, T033
- [ ] T043 [US3] Wire add/edit/remove actions to `addEntry`/`editEntry`/`removeEntry` mutations inside `WorkoutView` — depends on T014, T034, T041, T042
- [ ] T044 [US3] Implement the empty-workout state and a confirmation guard before starting an empty workout in `WorkoutView.tsx` — depends on T034, T043
- [ ] T045 [P] [US3] Build the manual "create workout" flow (workout-type picker + initial entries) in `src/routes/workout.new.tsx` — depends on T014, T041

**Checkpoint**: User Stories 1–3 independently functional

---

## Phase 6: User Story 4 - Review Workout History and Preferences (Priority: P2)

**Goal**: A user can browse past logged workouts and view/update the preferences that steer AI
suggestions.

**Independent Test**: Log a workout, confirm it appears in the history list with its recorded
details, and confirm an edited preference is reflected in a subsequent AI proposal.

### Tests for User Story 4

- [ ] T046 [P] [US4] Component test for history list rendering (date, type, summary) in `tests/unit/components/history/HistoryList.test.tsx`
- [ ] T047 [P] [US4] Playwright e2e test covering quickstart.md scenario 4 (history detail view, preference edit reflected in a new AI proposal) in `tests/e2e/history-preferences.spec.ts`

### Implementation for User Story 4

- [ ] T048 [P] [US4] Build the history list view in `src/components/history/HistoryList.tsx` — depends on T014
- [ ] T049 [US4] Wire the history route in `src/routes/history.tsx`, including opening a past workout via the existing workout detail route — depends on T035, T048
- [ ] T050 [P] [US4] Build the preferences form (goals, equipment, injuries, unit preference) in `src/components/preferences/PreferencesForm.tsx` — depends on T011
- [ ] T051 [P] [US4] Build the custom-API-key settings section (set/clear key, cap status display) in `src/components/preferences/ApiKeySettings.tsx` — depends on T011, T012
- [ ] T052 [US4] Wire the preferences route in `src/routes/preferences.tsx` — depends on T050, T051

**Checkpoint**: User Stories 1–4 independently functional

---

## Phase 7: User Story 5 - Use Previously Loaded Workouts Offline (Priority: P3)

**Goal**: A user without connectivity can still view, edit, and run any workout they previously
loaded while online, with new AI chat requests clearly indicated as requiring a connection.

**Independent Test**: Load a workout while online, go offline, and confirm it can still be
opened, edited, and run (with working timers); confirm a new AI chat request is clearly blocked
with a connectivity message.

### Tests for User Story 5

- [ ] T053 [P] [US5] Unit test for the offline persisted cache read/write behavior in `tests/unit/lib/offlineCache.test.ts`
- [ ] T054 [P] [US5] Playwright e2e test covering quickstart.md scenario 5 (offline workout access, offline chat-attempt messaging) in `tests/e2e/offline.spec.ts`

### Implementation for User Story 5

- [ ] T055 [US5] Wire the offline persisted cache into the workout-detail and history queries so opened workouts remain available offline — depends on T016, T035, T049
- [ ] T056 [US5] Implement online/offline detection and an "AI chat requires connection" banner in `ChatView` — depends on T026
- [ ] T057 [US5] Configure the Workbox runtime caching strategy for the app shell / static assets to support a fully offline cold reload — depends on T004

**Checkpoint**: All 5 user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple user stories

- [ ] T058 [P] Run the full quickstart.md validation pass across all 6 scenarios and record results
- [ ] T059 [P] Accessibility pass (keyboard navigation, ARIA labels) on the chat and workout-execution UI
- [ ] T060 [P] Add loading and error-boundary states across all routes in `src/routes/`
- [ ] T061 Run `pnpm lint` / `pnpm format` (Biome) across the repo and fix any violations
- [ ] T062 [P] Verify PWA installability (manifest, icons, offline cold-start) via a Lighthouse PWA audit
- [ ] T063 Decide and document the concrete default AI usage cap value (FR-022) in `convex/aiUsage.ts` and the project README

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion; stories may proceed
  in parallel across developers or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories
- **User Story 2 (P1)**: No dependency on other stories (shares `EntryEditor`-adjacent components
  with US3 but each is independently testable against Foundational alone)
- **User Story 3 (P2)**: Builds on the entry-rendering components introduced in US2
  (`StrengthEntry`/`IntervalEntry`), but is independently testable against any workout already
  created via Foundational-level mutations
- **User Story 4 (P2)**: Builds on the workout detail route from US2 to open a history item, but
  its own list/preferences views are independently testable
- **User Story 5 (P3)**: Builds on the workout detail/history routes from US2/US4 to cache them
  offline, and on the chat route from US1 for the offline-chat message

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend (Convex functions) before frontend components that call them
- Shared components before the routes that assemble them
- Story complete before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel once T009 (schema) is done
- Once Foundational completes, US1 and US2 can start in parallel (no cross-dependency)
- US3 and US4 can start once US2's entry components / US2's workout route exist, respectively
- US5 starts once US1's chat route and US2/US4's detail/history routes exist
- All tests for a user story marked [P] can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Launch both tests for User Story 1 together:
Task: "Component test for chat message list + composer in tests/unit/components/chat/ChatView.test.tsx"
Task: "Playwright e2e test for chat scenario in tests/e2e/chat.spec.ts"

# Launch independent implementation tasks together:
Task: "Implement postMessage mutation in convex/chat.ts"
Task: "Build the one-time AI-data-notice modal in src/components/chat/AiDataNotice.tsx"
Task: "Build the chat message list and composer in src/components/chat/ChatView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 independently
5. Demo the chat-to-structured-proposal flow

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate independently → demo (MVP: AI chat produces a workout)
3. Add User Story 2 → validate independently → demo (workouts are runnable with correct UI/timers)
4. Add User Story 3 → validate independently → demo (full manual control over entries)
5. Add User Story 4 → validate independently → demo (history + preferences close the loop)
6. Add User Story 5 → validate independently → demo (offline-resilient)
7. Polish phase → production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (chat)
   - Developer B: User Story 2 (execution UI/timers)
   - Developer C: starts User Story 4 (history/preferences) once US2's workout route lands, or
     works Foundational-adjacent polish in the meantime
3. User Story 3 follows once US2's entry components exist; User Story 5 follows once US1/US2/US4
   routes exist

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
