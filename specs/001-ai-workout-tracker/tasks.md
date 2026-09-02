---
description: "Task list template for feature implementation"
---

# Tasks: AI Workout Tracker

**Input**: Design documents from `/specs/001-ai-workout-tracker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all
present). Regenerated 2026-09-01 against the plan.md revision for constitution v1.2.1 (Principle
VII SOLID/dependency-inversion, Principle VIII DDD bounded contexts) — supersedes the prior
task list, which referenced a flat `convex/workouts.ts`/`convex/chat.ts` layout with no domain
layer.

**Tests**: Included. The constitution's Development Workflow & Quality Gates mandate Vitest +
React Testing Library coverage for component/unit changes and a Playwright smoke suite for
changes touching a core user flow — every user story here touches at least one such flow. Principle
VII additionally requires pure domain-logic modules to get direct Vitest coverage with no Convex
test harness, so Foundational domain-rule tasks include their own unit tests rather than deferring
to a story phase.

**Organization**: Tasks are grouped by user story (from spec.md, priority order P1 → P1 → P2 → P2
→ P3) to enable independent implementation and testing of each story. Within Setup and
Foundational, tasks are further grouped by bounded context (Workout Tracking, then AI Chat) per
constitution Principle VIII.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single repo, Convex-backed React PWA (per plan.md Structure Decision):
- `src/domain/workoutTracking/`, `src/domain/chat/`, `src/domain/shared/` — framework-agnostic
  domain logic, no Convex imports (Principle VII)
- `convex/workoutTracking/`, `convex/chat/`, `convex/preferences/` — Convex infrastructure/adapter
  layer, one directory per bounded context (Principle VIII)
- `src/` (routes, components, stores, hooks, lib) — frontend
- `tests/unit/domain/`, `tests/unit/components/`, `tests/unit/lib/`, `tests/e2e/` — tests

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

**Purpose**: The domain layer, its ports, and the Convex adapters for both bounded contexts — the
shared infrastructure every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Workout Tracking bounded context

- [ ] T009 Define Workout Tracking domain types (`Workout`, `ExerciseEntry`, `Set`, `WorkoutType`, `WorkoutStatus`, `WorkoutSummary`, `WorkoutDraftInput`, `EntryInput`, `EntryPatch`) in `src/domain/workoutTracking/types.ts` per data-model.md
- [ ] T010 [P] Define Workout Tracking domain ports (`WorkoutRepository`, `ExerciseCatalogRepository`) in `src/domain/workoutTracking/ports.ts` per contracts/workout-tracking-domain.md — depends on T009
- [ ] T011 [P] Implement Workout Tracking domain rules (`addEntry`, `editEntry`, `removeEntry`, `setStatus`, `validateEntry`) in `src/domain/workoutTracking/rules.ts` per contracts/workout-tracking-domain.md — depends on T009
- [ ] T012 [P] Unit test Workout Tracking domain rules against a hand-written fake `WorkoutRepository` (no Convex) in `tests/unit/domain/workoutTracking/rules.test.ts` — depends on T010, T011
- [ ] T013 Define the Convex schema for the Workout Tracking context (`workouts`, `exerciseCatalog` tables, including the `normalizedName` index) in `convex/workoutTracking/schema.ts` per data-model.md
- [ ] T014 Implement `ConvexWorkoutRepository` and `ConvexExerciseCatalogRepository`, satisfying T010's ports (including normalized-then-fuzzy match-or-create per research.md §4), in `convex/workoutTracking/repository.ts` — depends on T010, T013
- [ ] T015 Implement the Workout Tracking Convex function surface (`listWorkouts`, `getWorkout`, `createWorkout`, `updateWorkoutStatus`, `addEntry`, `editEntry`, `removeEntry`, `searchCatalog`, `resolveOrCreate`) in `convex/workoutTracking/functions.ts`, each handler delegating to T011's rules via T014's repositories, per contracts/workouts.md and contracts/exercise-catalog.md — depends on T011, T014

### AI Chat bounded context

- [ ] T016 [P] Define AI Chat domain types (`ChatConversation`, `ChatMessage`, `ProposalDraft`, `FatigueSignal`, `Preferences`, `PreferencesSnapshot`) in `src/domain/chat/types.ts` per data-model.md
- [ ] T017 [P] Define AI Chat domain ports (`ChatConversationRepository`, `AiChatProvider`, `FatigueSignalProvider`, `PreferencesRepository`, `AiUsagePolicy`) in `src/domain/chat/ports.ts` per contracts/ai-chat-domain.md — depends on T016
- [ ] T018 [P] Implement AI Chat domain rules (`decideGenerationOutcome`, `shouldShowAiDataNotice`, `buildPromptContext`) in `src/domain/chat/rules.ts` per contracts/ai-chat-domain.md — depends on T016, T017
- [ ] T019 [P] Unit test AI Chat domain rules against fake ports — cap-reached, notice-not-acknowledged, clarifying-question, and workout-proposal outcomes — in `tests/unit/domain/chat/rules.test.ts` — depends on T017, T018
- [ ] T020 Define the Convex schema for the AI Chat context (`chatConversations`, `aiUsage` tables) in `convex/chat/schema.ts`, and for Preferences (`userPreferences` table) in `convex/preferences/schema.ts`, per data-model.md
- [ ] T021 [P] Implement `ConvexChatConversationRepository` and `ConvexAiUsagePolicy`, satisfying the matching T017 ports, in `convex/chat/repository.ts` per contracts/chat.md and contracts/preferences.md — depends on T017, T020
- [ ] T022 [P] Implement `ClaudeAiChatProvider` — the only module that calls the Claude API, holding the API key server-side — in `convex/chat/claudeAiChatProvider.ts` per research.md §3 — depends on T017
- [ ] T023 [P] Implement `ConvexFatigueSignalProvider`, reading recent workouts through T014's `WorkoutRepository` rather than Workout Tracking's Convex tables directly, in `convex/chat/fatigueSignalProvider.ts` per research.md §6, §8 — depends on T014, T017
- [ ] T024 [P] Implement the Convex-backed `PreferencesRepository` in `convex/preferences/repository.ts` per contracts/ai-chat-domain.md — depends on T017, T020
- [ ] T025 [P] Implement the Preferences Convex function surface (`getPreferences`, `updatePreferences`, `acknowledgeAiDataNotice`, `setCustomApiKey`), ensuring `customApiKey` is never returned by any query, in `convex/preferences/functions.ts` per contracts/preferences.md — depends on T024

### Bounded-context translation boundary

- [ ] T026 Implement the translation boundary function `proposalToWorkoutDraft` — the ONLY module allowed to import both `src/domain/workoutTracking/types.ts` and `src/domain/chat/types.ts` — in `src/domain/shared/translation.ts` per research.md §8 — depends on T009, T016
- [ ] T027 [P] Unit test the translation boundary in `tests/unit/domain/shared/translation.test.ts` — depends on T026

### Cross-cutting frontend utilities

- [ ] T028 [P] Implement the wall-clock timer utility (`targetEndTime`-based countdown, Page Visibility recompute-on-focus) in `src/lib/timer.ts` per research.md §1
- [ ] T029 [P] Implement the offline persisted query cache (TanStack Query + IndexedDB persister) in `src/lib/offlineCache.ts` per research.md §2
- [ ] T030 [P] Implement the unit-preference/locale-default helper in `src/lib/units.ts`

**Checkpoint**: Foundation ready — both bounded contexts have working domain logic, ports, Convex
adapters, and function surfaces; user story implementation can now begin

---

## Phase 3: User Story 1 - Build a Workout Through AI Chat (Priority: P1) 🎯 MVP

**Goal**: A user describes a workout need in chat and receives a structured AI proposal (or a
clarifying question) grounded in their history, fatigue signal, and preferences, and can accept it
into an editable workout — the AI Chat context's proposal crossing into a real Workout Tracking
`Workout` only through the T026 translation boundary.

**Independent Test**: Open the chat, enter a workout request, and confirm the AI returns a
structured set of exercises that becomes available as an editable workout.

### Tests for User Story 1

- [ ] T031 [P] [US1] Component test for chat message list + composer rendering (user/assistant messages, clarifying-question state) in `tests/unit/components/chat/ChatView.test.tsx`
- [ ] T032 [P] [US1] Playwright e2e test covering quickstart.md scenario 1 (structured proposal, ambiguous-request clarifying question, accept-into-workout) in `tests/e2e/chat.spec.ts`

### Implementation for User Story 1

- [ ] T033 [US1] Implement `postMessage` and the `generateWorkout` action — constructing `AiUsagePolicy`, `PreferencesRepository`, `ClaudeAiChatProvider`, `FatigueSignalProvider`, `ChatConversationRepository` and calling `rules.ts`'s `buildPromptContext`/`decideGenerationOutcome` — in `convex/chat/functions.ts` per contracts/chat.md — depends on T018, T021, T022, T023, T024
- [ ] T034 [US1] Implement `acceptProposal` in `convex/chat/functions.ts` — calling T026's `proposalToWorkoutDraft` then `workoutTracking/functions.ts`'s `createWorkout` — per contracts/chat.md — depends on T015, T026, T033
- [ ] T035 [P] [US1] Build the one-time AI-data-notice modal in `src/components/chat/AiDataNotice.tsx` (FR-019) — depends on T025
- [ ] T036 [P] [US1] Build the chat message list and composer in `src/components/chat/ChatView.tsx` and `src/components/chat/ChatComposer.tsx`
- [ ] T037 [US1] Build the proposed-workout preview with accept/discard controls in `src/components/chat/ProposedWorkoutPreview.tsx` — depends on T036
- [ ] T038 [US1] Wire the chat route in `src/routes/chat.tsx` using TanStack Query hooks over `postMessage`/`generateWorkout`/`acceptProposal` — depends on T033, T034, T035, T036, T037
- [ ] T039 [US1] Implement clarifying-question and error-state (`ai_unreachable`, `cap_reached`) rendering in `ChatView`, with manual-retry and build-it-yourself fallback affordances (FR-004, FR-020, FR-022) — depends on T038
- [ ] T040 [US1] Add a "configure your own API key" link from the `cap_reached` error state to the preferences route (FR-023) — depends on T039

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

- [ ] T041 [P] [US2] Unit test for the wall-clock timer utility's drift/recompute-on-focus behavior in `tests/unit/lib/timer.test.ts`
- [ ] T042 [P] [US2] Component test asserting strength vs. interval controls render per `workoutType` in `tests/unit/components/workout/WorkoutView.test.tsx`
- [ ] T043 [P] [US2] Playwright e2e test covering quickstart.md scenario 2 (type-adaptive controls, timer accuracy across a simulated backgrounding event) in `tests/e2e/workout-execution.spec.ts`

### Implementation for User Story 2

- [ ] T044 [P] [US2] Build the strength entry component (per-set reps/weight fields) in `src/components/workout/StrengthEntry.tsx`
- [ ] T045 [P] [US2] Build the interval entry + timer component (work/rest countdown, start/pause/reset) in `src/components/workout/IntervalTimer.tsx` — depends on T028
- [ ] T046 [US2] Build the `WorkoutView` container that selects `StrengthEntry`/`IntervalEntry` per `workoutType` in `src/components/workout/WorkoutView.tsx` — depends on T044, T045
- [ ] T047 [US2] Wire the workout detail route in `src/routes/workout.$workoutId.tsx` using `getWorkout` and `updateWorkoutStatus` — depends on T015, T046
- [ ] T048 [US2] Implement background interval-boundary notifications via the service worker Notification API, invoked from `src/lib/timer.ts` — depends on T004, T028
- [ ] T049 [US2] Implement Wake Lock request/release during an active timer in `IntervalTimer.tsx` — depends on T045

**Checkpoint**: User Stories 1 AND 2 both independently functional

---

## Phase 5: User Story 3 - Edit and Manage Workout Entries (Priority: P2)

**Goal**: A user can add, edit, and remove any exercise entry on any workout — AI-generated,
manual, or already completed.

**Independent Test**: On any existing workout, add a new entry, edit an existing entry's values,
and remove a different entry, confirming each change persists after navigating away and back.

### Tests for User Story 3

- [ ] T050 [P] [US3] Component test for add/edit/remove entry flows, including the empty-workout state, in `tests/unit/components/workout/EntryEditor.test.tsx`
- [ ] T051 [P] [US3] Playwright e2e test covering quickstart.md scenario 3 (add with near-duplicate name resolving to the same catalog entry, edit, remove, persistence) in `tests/e2e/edit-entries.spec.ts`

### Implementation for User Story 3

- [ ] T052 [P] [US3] Build an exercise-name autocomplete input backed by `searchCatalog` in `src/components/workout/ExerciseAutocomplete.tsx` — depends on T015
- [ ] T053 [US3] Build the add-entry form (type-appropriate fields based on parent `workoutType`) in `src/components/workout/AddEntryForm.tsx` — depends on T052
- [ ] T054 [US3] Build inline edit/remove controls per entry in `src/components/workout/EntryEditor.tsx` — depends on T044, T045
- [ ] T055 [US3] Wire add/edit/remove actions to `addEntry`/`editEntry`/`removeEntry` mutations inside `WorkoutView` — depends on T015, T046, T053, T054
- [ ] T056 [US3] Implement the empty-workout state and a confirmation guard before starting an empty workout in `WorkoutView.tsx` — depends on T046, T055
- [ ] T057 [P] [US3] Build the manual "create workout" flow (workout-type picker + initial entries) in `src/routes/workout.new.tsx` — depends on T015, T053

**Checkpoint**: User Stories 1–3 independently functional

---

## Phase 6: User Story 4 - Review Workout History and Preferences (Priority: P2)

**Goal**: A user can browse past logged workouts and view/update the preferences that steer AI
suggestions.

**Independent Test**: Log a workout, confirm it appears in the history list with its recorded
details, and confirm an edited preference is reflected in a subsequent AI proposal.

### Tests for User Story 4

- [ ] T058 [P] [US4] Component test for history list rendering (date, type, summary) in `tests/unit/components/history/HistoryList.test.tsx`
- [ ] T059 [P] [US4] Playwright e2e test covering quickstart.md scenario 4 (history detail view, preference edit reflected in a new AI proposal) in `tests/e2e/history-preferences.spec.ts`

### Implementation for User Story 4

- [ ] T060 [P] [US4] Build the history list view in `src/components/history/HistoryList.tsx` — depends on T015
- [ ] T061 [US4] Wire the history route in `src/routes/history.tsx`, including opening a past workout via the existing workout detail route — depends on T047, T060
- [ ] T062 [P] [US4] Build the preferences form (goals, equipment, injuries, unit preference) in `src/components/preferences/PreferencesForm.tsx` — depends on T025
- [ ] T063 [P] [US4] Build the custom-API-key settings section (set/clear key, cap status display) in `src/components/preferences/ApiKeySettings.tsx` — depends on T025, T021
- [ ] T064 [US4] Wire the preferences route in `src/routes/preferences.tsx` — depends on T062, T063

**Checkpoint**: User Stories 1–4 independently functional

---

## Phase 7: User Story 5 - Use Previously Loaded Workouts Offline (Priority: P3)

**Goal**: A user without connectivity can still view, edit, and run any workout they previously
loaded while online, with new AI chat requests clearly indicated as requiring a connection.

**Independent Test**: Load a workout while online, go offline, and confirm it can still be
opened, edited, and run (with working timers); confirm a new AI chat request is clearly blocked
with a connectivity message.

### Tests for User Story 5

- [ ] T065 [P] [US5] Unit test for the offline persisted cache read/write behavior in `tests/unit/lib/offlineCache.test.ts`
- [ ] T066 [P] [US5] Playwright e2e test covering quickstart.md scenario 5 (offline workout access, offline chat-attempt messaging) in `tests/e2e/offline.spec.ts`

### Implementation for User Story 5

- [ ] T067 [US5] Wire the offline persisted cache into the workout-detail and history queries so opened workouts remain available offline — depends on T029, T047, T061
- [ ] T068 [US5] Implement online/offline detection and an "AI chat requires connection" banner in `ChatView` — depends on T038
- [ ] T069 [US5] Configure the Workbox runtime caching strategy for the app shell / static assets to support a fully offline cold reload — depends on T004

**Checkpoint**: All 5 user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple user stories

- [ ] T070 [P] Run the full quickstart.md validation pass across all 6 scenarios and record results
- [ ] T071 [P] Accessibility pass (keyboard navigation, ARIA labels) on the chat and workout-execution UI
- [ ] T072 [P] Add loading and error-boundary states across all routes in `src/routes/`
- [ ] T073 Run `pnpm lint` / `pnpm format` (Biome) across the repo, including a manual check that no file under `src/domain/` imports `convex/_generated`, `convex/server`, or the Anthropic SDK (Principle VII), and that neither `src/domain/workoutTracking/` nor `src/domain/chat/` imports the other's `types.ts` outside `src/domain/shared/translation.ts` (Principle VIII)
- [ ] T074 [P] Verify PWA installability (manifest, icons, offline cold-start) via a Lighthouse PWA audit
- [ ] T075 Decide and document the concrete default AI usage cap value (FR-022) in `convex/chat/repository.ts` (`ConvexAiUsagePolicy`) and the project README

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories. Within it,
  Workout Tracking (T009–T015) and AI Chat (T016–T025) proceed in parallel as two independent
  tracks up until T023 (`ConvexFatigueSignalProvider`, which needs T014) and T026 (translation
  boundary, which needs both T009 and T016)
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion; stories may proceed
  in parallel across developers or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories
- **User Story 2 (P1)**: No dependency on other stories (shares `EntryEditor`-adjacent components
  with US3 but each is independently testable against Foundational alone)
- **User Story 3 (P2)**: Builds on the entry-rendering components introduced in US2
  (`StrengthEntry`/`IntervalEntry`), but is independently testable against any workout already
  created via Foundational-level Convex functions
- **User Story 4 (P2)**: Builds on the workout detail route from US2 to open a history item, but
  its own list/preferences views are independently testable
- **User Story 5 (P3)**: Builds on the workout detail/history routes from US2/US4 to cache them
  offline, and on the chat route from US1 for the offline-chat message

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Domain logic and Convex adapters (already built in Foundational) before the frontend components
  that call them
- Shared components before the routes that assemble them
- Story complete before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Within Foundational, the Workout Tracking track (T009–T015) and the AI Chat track (T016–T025,
  minus T023 which needs T014) can be staffed in parallel by two developers
- Once Foundational completes, US1 and US2 can start in parallel (no cross-dependency)
- US3 and US4 can start once US2's entry components / US2's workout route exist, respectively
- US5 starts once US1's chat route and US2/US4's detail/history routes exist
- All tests for a user story marked [P] can run in parallel with each other

---

## Parallel Example: Foundational Phase

```bash
# Two developers can split the two bounded-context tracks:
# Developer A — Workout Tracking:
Task: "Define Workout Tracking domain types in src/domain/workoutTracking/types.ts"
Task: "Define Workout Tracking domain ports in src/domain/workoutTracking/ports.ts"
Task: "Implement Workout Tracking domain rules in src/domain/workoutTracking/rules.ts"

# Developer B — AI Chat (independent until translation.ts):
Task: "Define AI Chat domain types in src/domain/chat/types.ts"
Task: "Define AI Chat domain ports in src/domain/chat/ports.ts"
Task: "Implement AI Chat domain rules in src/domain/chat/rules.ts"
```

## Parallel Example: User Story 1

```bash
# Launch both tests for User Story 1 together:
Task: "Component test for chat message list + composer in tests/unit/components/chat/ChatView.test.tsx"
Task: "Playwright e2e test for chat scenario in tests/e2e/chat.spec.ts"

# Launch independent implementation tasks together:
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

1. Setup + Foundational → foundation ready (both bounded contexts wired end to end)
2. Add User Story 1 → validate independently → demo (MVP: AI chat produces a workout)
3. Add User Story 2 → validate independently → demo (workouts are runnable with correct UI/timers)
4. Add User Story 3 → validate independently → demo (full manual control over entries)
5. Add User Story 4 → validate independently → demo (history + preferences close the loop)
6. Add User Story 5 → validate independently → demo (offline-resilient)
7. Polish phase → production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together, then splits Foundational along the bounded-context tracks
   (Workout Tracking vs. AI Chat) described above
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
- Avoid: a domain module (`src/domain/**`) importing Convex or the Anthropic SDK, or the two
  bounded contexts importing each other's types outside `src/domain/shared/translation.ts`
  (Principles VII/VIII — checked in T073)
