# Implementation Plan: AI Workout Tracker

**Branch**: `001-ai-workout-tracker` | **Date**: 2026-09-01 (revised — see Revision History) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-ai-workout-tracker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Revision History

- **2026-08-31**: Initial plan, drafted against constitution v1.1.0.
- **2026-09-01**: Revised against constitution v1.2.1, which added Principle VII (SOLID &
  Dependency Inversion) and Principle VIII (Domain-Driven Boundaries & Ubiquitous Language), and
  corrected "AI coaching" wording to "AI chat" throughout. This revision restructures the codebase
  into two bounded contexts (Workout Tracking, AI Chat) connected by an explicit translation
  boundary, with domain logic isolated behind ports from Convex infrastructure. No functional
  requirement, entity, or Convex-facing behavior changes as a result — this is an internal
  architecture revision, not a scope change.

## Summary

AIGYM is a single-user PWA that lets a person build workouts through an AI chat (grounded in their
logged history, fatigue signal, and stated preferences), then run those workouts through a
type-adaptive UI (rep/weight entry for strength, work/rest interval timers for HIIT) with full
manual add/edit/remove control over every entry — all while remaining usable offline for
previously loaded workouts. Technical approach: a React 19 + TypeScript SPA (Vite, TanStack
Router/Query, Zustand, Tailwind) backed entirely by Convex as the reactive single source of truth
for workouts, the exercise catalog, chat conversations, and preferences; the AI chat is delivered
by a Convex action that calls the Claude API server-side (holding the API key, or the user's own
configured key), never from the client. PWA installability/offline support is provided by
vite-plugin-pwa + Workbox, layered with a client-side query cache so previously loaded workouts
remain viewable, editable, and runnable (with accurate timers) without network connectivity.

Per constitution Principles VII/VIII, the codebase is organized as two bounded contexts — **Workout
Tracking** (Workout, Exercise, Set) and **AI Chat** (Chat Conversation, workout proposals, the
fatigue signal) — each with its own domain model isolated from Convex behind ports/interfaces, and
connected only through an explicit translation layer (an accepted chat proposal becomes a Workout
Tracking `Workout` via a mapping function, never by the two contexts sharing internal types).

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode (both `src/` frontend and `convex/` backend functions run on the same TypeScript toolchain)

**Primary Dependencies**: React 19, Vite, TanStack Router, TanStack Query, Zustand, Tailwind CSS, vite-plugin-pwa + Workbox, Convex (client + server), Anthropic Claude API (called server-side only, via a Convex action)

**Storage**: Convex (reactive, TypeScript-native database) — sole source of truth for workouts, exercise catalog, chat conversations, preferences, and AI usage counters; no external files or vault. Each bounded context owns its own tables; Convex is the shared storage substrate, not a shared domain model (Principle VIII).

**Testing**: Vitest + React Testing Library for unit/component tests (including pure domain-logic unit tests with no Convex dependency); Playwright for a small end-to-end smoke suite covering the five user stories

**Target Platform**: Installable web PWA, primarily mobile-browser-in-gym usage, also desktop browsers; must run previously loaded workouts fully offline

**Project Type**: Web application — single repo, Convex-backed React SPA (no separate backend server process; Convex functions in `convex/` are the infrastructure/adapter layer; domain logic lives in `src/domain/`, framework-agnostic)

**Performance Goals**: Chat-to-ready-workout under 3 minutes (SC-001); single entry add/edit/remove under 15 seconds (SC-003); workout timers accurate within 1 second of drift over a 30-minute session, including through backgrounding (SC-004)

**Constraints**: Previously loaded workouts (view/edit/run/timers) MUST work fully offline (SC-005, FR-017); AI chat requires connectivity and MUST fail gracefully with a clear error and no auto-retry/queueing (FR-020); the Claude API key (default or user-supplied) MUST stay server-side, never reaching the client (FR-023, constitution Platform & Technology Constraints); a soft daily cap gates the app's default AI access without ever blocking non-AI functionality (FR-022, SC-008); domain logic MUST NOT import Convex APIs directly (Principle VII); Workout Tracking and AI Chat domain types MUST NOT reference each other directly (Principle VIII)

**Scale/Scope**: Single local user profile per installation (no auth, no multi-tenant data isolation in v1) — 5 user stories, 23 functional requirements, 2 bounded contexts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Section | Gate | Status |
|---|---|---|
| I. Conversational, History-Aware Workout Generation | AI chat is the primary creation path (User Story 1); the Claude adapter MUST receive conversation history + recent workout data as context and return structured data (data-model shapes), not prose-only | PASS |
| II. Fatigue-Aware Guidance | Fatigue/recovery signal computed from the Workout Tracking read-model (via a port, not direct table access) and passed into every AI Chat generation call (FR-005, SC-007) | PASS |
| III. Ask, Don't Assume | The AI Chat domain's proposal-generation rule requires a clarifying-question response path instead of silent defaults (FR-004); same posture applied to AI-usage-cap and injury-conflict edge cases | PASS |
| IV. Editable, User-Controlled Workout Data | All entries editable via Workout Tracking mutations regardless of workout status (FR-007–FR-009a); edits persist server-side, no round-trip through chat required | PASS |
| V. Workout-Type-Adaptive UI | `workoutType` drives which entry/timer components render (FR-010); new types require an explicit UI mapping before exposure, consistent with constitution | PASS |
| VI. Reliable In-Workout Timing | Timers computed from wall-clock timestamps (not `setInterval` counters) so state survives backgrounding/lock (FR-011, FR-012, SC-004) — detailed in research.md | PASS |
| VII. SOLID & Dependency Inversion | Each Convex function delegates to a single-purpose domain function; `src/domain/*/ports.ts` interfaces sit between domain logic and Convex (repositories, `AiChatProvider`, `FatigueSignalProvider`); no domain module imports `convex/_generated` | PASS |
| VIII. Domain-Driven Boundaries & Ubiquitous Language | Workout Tracking and AI Chat are separate `src/domain/` modules with their own types; `src/domain/shared/translation.ts` is the only place an accepted proposal becomes a `Workout`; canonical terms (Workout, Exercise, Set, Chat Conversation) used consistently across data-model.md, contracts/, and code module names | PASS |
| PWA / offline (Platform & Technology Constraints) | vite-plugin-pwa + Workbox for installability/caching; client-side persisted query cache keeps already-loaded workout data usable offline (FR-017, SC-005) | PASS |
| Structured interchange at the context boundary (Platform & Technology Constraints) | `src/domain/shared/translation.ts` defines the one structured mapping from an AI Chat proposal to a Workout Tracking `Workout`, satisfying "no manual reformatting" without requiring one shared internal model | PASS |
| Server-side Claude integration (Platform & Technology Constraints) | Claude API called only from the `ClaudeAiChatProvider` adapter, itself only invoked by the Convex `generateWorkout` action; API key (default or user-supplied) never sent to or stored on the client (FR-023) | PASS |
| No auth in v1 (Platform & Technology Constraints) | Single local profile, no login flow (FR-018) — matches spec Assumptions | PASS |
| Tech stack (React/Vite/TanStack/Zustand/Tailwind, pnpm, Biome) | Adopted as specified; no deviations | PASS |
| Testing gates (Vitest+RTL, Playwright smoke) | Quickstart.md scopes the Playwright smoke suite to the 5 user stories; pure domain-logic modules get direct Vitest unit coverage with no Convex test harness needed, per Principle VII | PASS |

No violations requiring Complexity Tracking justification.

**Post-Phase 1 re-check**: data-model.md, contracts/, and quickstart.md were reviewed against this
table after design — no new violations. The `UserPreferences.customApiKey` field required an
explicit contract rule (never returned by any query, per `contracts/preferences.md`) to keep the
server-side-only key handling constraint intact through the data model. Splitting the schema into
two bounded-context table groups (`workoutTracking/schema.ts`, `aiChat/schema.ts`) required
confirming the single-source-of-truth rule still holds — both groups live in the same Convex
deployment, so it does (Platform & Technology Constraints, "each context MAY persist its own data
shape within Convex").

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-workout-tracker/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── workout-tracking-domain.md   # domain ports for the Workout Tracking context
│   ├── ai-chat-domain.md             # domain ports for the AI Chat context
│   ├── workouts.md                    # Convex function surface (Workout Tracking)
│   ├── exercise-catalog.md
│   ├── chat.md                          # Convex function surface (AI Chat)
│   └── preferences.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── domain/                              # Framework-agnostic domain logic (Principle VII/VIII) — no Convex imports
│   ├── workoutTracking/
│   │   ├── types.ts                      # Workout, Exercise, Set, WorkoutType — pure types
│   │   ├── rules.ts                       # status transitions, empty-workout guard, entry validation per type
│   │   └── ports.ts                        # WorkoutRepository, ExerciseCatalogRepository interfaces
│   ├── chat/
│   │   ├── types.ts                      # ChatConversation ("Chat Conversation"), ChatMessage, ProposalDraft
│   │   ├── rules.ts                       # clarifying-question decision, cap/BYOK decision, prompt-context assembly
│   │   └── ports.ts                        # ChatConversationRepository, AiChatProvider, FatigueSignalProvider, PreferencesRepository, AiUsagePolicy interfaces
│   └── shared/
│       └── translation.ts                # the ONLY place a ProposalDraft becomes a Workout (context boundary)
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

convex/
├── workoutTracking/
│   ├── schema.ts                # Workout, ExerciseCatalog tables
│   ├── repository.ts             # ConvexWorkoutRepository / ConvexExerciseCatalogRepository — implement domain ports
│   └── functions.ts               # thin queries/mutations delegating to src/domain/workoutTracking/rules.ts
├── chat/
│   ├── schema.ts                # ChatConversation, AiUsage tables
│   ├── repository.ts             # ConvexChatConversationRepository, ConvexAiUsagePolicy — implement domain ports
│   ├── claudeAiChatProvider.ts    # AiChatProvider implementation — the only module that calls the Claude API
│   ├── fatigueSignalProvider.ts    # FatigueSignalProvider — reads Workout Tracking data via its repository port
│   └── functions.ts                 # postMessage, generateWorkout (action), acceptProposal — delegate to src/domain/chat/rules.ts + translation.ts
├── preferences/
│   ├── schema.ts                 # UserPreferences table (shared supporting data)
│   └── functions.ts
└── _generated/                     # Convex-generated types (auto, not hand-written)

public/
├── manifest.webmanifest             # generated by vite-plugin-pwa
└── icons/

tests/
├── unit/
│   ├── domain/                        # pure domain-logic tests, no Convex harness (Principle VII)
│   └── components/                     # Vitest + React Testing Library
└── e2e/                                 # Playwright smoke suite (5 user stories)
```

**Structure Decision**: Single repository, Convex-backed React PWA. There is no separate
`backend/` process — Convex's `convex/` directory is the infrastructure/adapter layer (schema,
queries, mutations, the server-side Claude adapter), colocated with the `src/` frontend in one
deploy unit. Within that, `src/domain/` holds framework-agnostic business logic split into the
Workout Tracking and AI Chat bounded contexts (Principle VIII); `convex/workoutTracking/` and
`convex/chat/` are the corresponding infrastructure adapters, each implementing that context's
domain ports (Principle VII) rather than domain code reaching into `ctx.db` or the Claude SDK
directly.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
