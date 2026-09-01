# Implementation Plan: AI Workout Tracker

**Branch**: `001-ai-workout-tracker` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ai-workout-tracker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

AIGYM is a single-user PWA that lets a person build workouts through an AI chat (grounded in their
logged history, fatigue signal, and stated preferences), then run those workouts through a
type-adaptive UI (rep/weight entry for strength, work/rest interval timers for HIIT) with full
manual add/edit/remove control over every entry — all while remaining usable offline for
previously loaded workouts. Technical approach: a React 19 + TypeScript SPA (Vite, TanStack
Router/Query, Zustand, Tailwind) backed entirely by Convex as the reactive single source of truth
for workouts, the exercise catalog, chat history, and preferences; AI coaching is delivered by a
Convex action that calls the Claude API server-side (holding the API key, or the user's own
configured key), never from the client. PWA installability/offline support is provided by
vite-plugin-pwa + Workbox, layered with a client-side query cache so previously loaded workouts
remain viewable, editable, and runnable (with accurate timers) without network connectivity.

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode (both `src/` frontend and `convex/` backend functions run on the same TypeScript toolchain)

**Primary Dependencies**: React 19, Vite, TanStack Router, TanStack Query, Zustand, Tailwind CSS, vite-plugin-pwa + Workbox, Convex (client + server), Anthropic Claude API (called server-side only, via a Convex action)

**Storage**: Convex (reactive, TypeScript-native database) — sole source of truth for workouts, exercise catalog, chat conversations, preferences, and AI usage counters; no external files or vault

**Testing**: Vitest + React Testing Library for unit/component tests; Playwright for a small end-to-end smoke suite covering the five user stories

**Target Platform**: Installable web PWA, primarily mobile-browser-in-gym usage, also desktop browsers; must run previously loaded workouts fully offline

**Project Type**: Web application — single repo, Convex-backed React SPA (no separate backend server process; Convex functions in `convex/` are the backend layer)

**Performance Goals**: Chat-to-ready-workout under 3 minutes (SC-001); single entry add/edit/remove under 15 seconds (SC-003); workout timers accurate within 1 second of drift over a 30-minute session, including through backgrounding (SC-004)

**Constraints**: Previously loaded workouts (view/edit/run/timers) MUST work fully offline (SC-005, FR-017); AI chat requires connectivity and MUST fail gracefully with a clear error and no auto-retry/queueing (FR-020); the Claude API key (default or user-supplied) MUST stay server-side, never reaching the client (FR-023, constitution Platform & Technology Constraints); a soft daily cap gates the app's default AI access without ever blocking non-AI functionality (FR-022, SC-008)

**Scale/Scope**: Single local user profile per installation (no auth, no multi-tenant data isolation in v1) — 5 user stories, 23 functional requirements, 7 key entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Section | Gate | Status |
|---|---|---|
| I. Conversational, History-Aware Workout Generation | AI chat is the primary creation path (User Story 1); Claude action MUST receive conversation history + recent workout data as context and return structured data (data-model `ExerciseEntry`/`Workout` shapes), not prose-only | PASS |
| II. Fatigue-Aware Guidance | Fatigue/recovery signal computed from persisted workout log (Convex `workouts` table) and passed into every AI generation call (FR-005, SC-007) | PASS |
| III. Ask, Don't Assume | Claude action prompt/tool contract requires a clarifying-question response path instead of silent defaults (FR-004); same posture applied to AI-usage-cap and injury-conflict edge cases | PASS |
| IV. Editable, User-Controlled Workout Data | All entries editable via Convex mutations regardless of workout status (FR-007–FR-009a); edits persist server-side, no round-trip through chat required | PASS |
| V. Workout-Type-Adaptive UI | `workoutType` drives which entry/timer components render (FR-010); new types require an explicit UI mapping before exposure, consistent with constitution | PASS |
| VI. Reliable In-Workout Timing | Timers computed from wall-clock timestamps (not `setInterval` counters) so state survives backgrounding/lock (FR-011, FR-012, SC-004) — detailed in research.md | PASS |
| PWA / offline (Platform & Technology Constraints) | vite-plugin-pwa + Workbox for installability/caching; client-side persisted query cache keeps already-loaded workout data usable offline (FR-017, SC-005) | PASS |
| Structured shared schema (Platform & Technology Constraints) | Single Convex schema (`convex/schema.ts`) shared by AI output, workout UI, and fatigue computation — no per-consumer reformatting | PASS |
| Server-side Claude integration (Platform & Technology Constraints) | Claude API called only from a Convex action; API key (default or user-supplied) never sent to or stored on the client (FR-023) | PASS |
| No auth in v1 (Platform & Technology Constraints) | Single local profile, no login flow (FR-018) — matches spec Assumptions | PASS |
| Tech stack (React/Vite/TanStack/Zustand/Tailwind, pnpm, Biome) | Adopted as specified; no deviations | PASS |
| Testing gates (Vitest+RTL, Playwright smoke) | Quickstart.md scopes the Playwright smoke suite to the 5 user stories; unit coverage expected per component in tasks phase | PASS |

No violations requiring Complexity Tracking justification.

**Post-Phase 1 re-check**: data-model.md, contracts/, and quickstart.md were reviewed against this
table after design — no new violations. The `UserPreferences.customApiKey` field required an
explicit contract rule (never returned by any query, per `contracts/preferences.md`) to keep the
server-side-only key handling constraint intact through the data model.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-workout-tracker/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── workouts.md
│   ├── exercise-catalog.md
│   ├── chat.md
│   └── preferences.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
convex/
├── schema.ts             # Workout, ExerciseCatalog, ChatConversation, UserPreferences, AiUsage tables
├── workouts.ts            # queries/mutations: create, update, addEntry, editEntry, removeEntry, list, get
├── exerciseCatalog.ts      # queries/mutations: search/match, upsert-on-new-name
├── chat.ts                  # mutation: postMessage; action: generateWorkout (calls Claude API server-side)
├── preferences.ts            # queries/mutations: get/update preferences, set custom API key
├── fatigue.ts                  # query: computeFatigueSignal(recent workouts)
├── aiUsage.ts                    # query/mutation: checkAndIncrementDailyCap
└── _generated/                    # Convex-generated types (auto, not hand-written)

src/
├── main.tsx
├── routes/                # TanStack Router route tree
│   ├── chat.tsx
│   ├── workout.$workoutId.tsx
│   ├── history.tsx
│   └── preferences.tsx
├── components/
│   ├── chat/               # message list, composer, proposed-workout preview
│   ├── workout/              # WorkoutView, type-adaptive renderers (StrengthEntry, IntervalEntry), Timer
│   └── shared/
├── stores/                    # Zustand: active timer/session UI state (not persisted server data)
├── hooks/                       # TanStack Query hooks wrapping the Convex client
├── lib/                           # offline cache persister, unit conversion, wall-clock timer utility
└── styles/

public/
├── manifest.webmanifest             # generated by vite-plugin-pwa
└── icons/

tests/
├── unit/                              # Vitest + React Testing Library
└── e2e/                                 # Playwright smoke suite (5 user stories)
```

**Structure Decision**: Single repository, Convex-backed React PWA. There is no separate
`backend/` process — Convex's `convex/` directory *is* the backend layer (schema, queries,
mutations, and the server-side Claude action), colocated with the `src/` frontend in one deploy
unit, matching Convex's standard project convention rather than the generic frontend/backend
split.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
