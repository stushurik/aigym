<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0
- Modified principles: none of the original six Core Principles redefined
- Added principles:
  - VII. SOLID & Dependency Inversion in Implementation Code
  - VIII. Domain-Driven Boundaries & Ubiquitous Language
- Modified sections:
  - Platform & Technology Constraints: reworded the "structured schema shared between the AI
    chat's output, the workout UI, and the fatigue-signal calculation" bullet to clarify it governs
    the interchange/mapping format at the workout-tracking/AI-coaching boundary (Principle VIII),
    not a single shared internal domain model; added a clause allowing separate bounded-context
    persistence within the same Convex deployment.
  - Development Workflow & Quality Gates: added gates for domain-logic/infrastructure coupling and
    cross-bounded-context references, per new Principles VII and VIII.
- Added sections: none
- Removed sections: none
- Templates requiring follow-up: existing specs/001-ai-workout-tracker/spec.md and
  data-model.md predate Principle VIII's ubiquitous-language list and bounded-context split — e.g.
  spec.md currently names the AI-negotiation entity "Chat Conversation" (not "CoachingSession")
  and uses "Exercise Entry" rather than separate "Exercise"/"Set" terms, and data-model.md
  currently describes one largely shared Convex schema across workout-tracking and AI-coaching
  data. This command's scope guard does not permit editing those files; reconcile them against
  Principles VII/VIII the next time spec.md or plan.md is revised.
- Follow-up TODOs: none.
-->

# AIGYM Constitution

## Core Principles

### I. Conversational, History-Aware Workout Generation (AI Chat-First)
The AI chat MUST be the primary interface for workout creation: a user describes their goals,
constraints, or needs in natural language, and the AI MUST propose specific exercises or a
complete workout in response. Every proposal MUST take the user's historic logged workouts and
stated preferences into account, not just the current message in isolation. Every AI-generated
workout MUST be emitted as structured data (exercises, sets, reps, weights, timing) — not
free-form prose only — so it can directly populate the editable workout UI.
**Rationale**: A chat that ignores what the user has actually done before produces generic,
context-blind suggestions; the product's value is in building on real history, not guessing fresh
each time.

### II. Fatigue-Aware Guidance
The system MUST derive an ongoing fatigue/recovery signal per user from their logged workout
history (e.g., recent volume, intensity, frequency, and recency of training). Any AI-generated
workout or suggestion MUST take the current fatigue signal into account — for example, it MUST
NOT recommend a high-intensity session when the signal indicates the user needs recovery — and
MUST be able to state in plain language why the suggestion accounts for fatigue when asked.
**Rationale**: Recommending workouts without regard to accumulated fatigue risks injury and
overtraining; fatigue-awareness is what makes the AI's guidance safe to follow, not just clever.

### III. Ask, Don't Assume — Ambiguity Resolution
Whenever the AI chat or the app encounters an ambiguous request, missing information that
materially affects the outcome, or a choice with meaningfully different implications (e.g.,
unclear goal, unspecified available equipment, whether to override a fatigue-based
recommendation), it MUST ask the user a clarifying question rather than silently picking a
default.
**Rationale**: In a fitness context, a silently wrong assumption (e.g., about intensity or
injury constraints) can lead to unsafe or unhelpful workouts; asking preserves user trust and
safety over false convenience.

### IV. Editable, User-Controlled Workout Data
Every field of a generated or logged workout (exercise selection, sets, reps, weight,
rest/interval duration) MUST be directly editable by the user in the workout UI. Users MUST be
able to add new entries, edit existing entries, and remove entries from any workout. Edits MUST
persist and MUST NOT require returning to the chat flow to make manual adjustments.
**Rationale**: Users need to override or fine-tune AI suggestions against real-world constraints
(available equipment, fatigue, injury) without re-negotiating the whole workout through chat.

### V. Workout-Type-Adaptive UI
The workout UI MUST adapt its layout and controls to the type of workout it renders — for
example, interval/HIIT workouts MUST present work/rest interval timers, while strength workouts
MUST present sets/reps/weight entry — rather than forcing every workout through one generic
layout. Introducing a new workout type MUST define its UI mapping before that type is exposed to
users.
**Rationale**: A HIIT session and a strength session have fundamentally different in-workout
needs (time-driven vs. rep-driven); a single generic layout would degrade usability for both.

### VI. Reliable In-Workout Timing
Any timer-driven workout flow (HIIT intervals, rest timers, etc.) MUST keep accurate time even
when the screen locks, the app is backgrounded, or the device sleeps. Timer state MUST be
recoverable — resuming with the correct remaining time — after such an interruption.
**Rationale**: Users run workouts with the phone out of hand or the screen off; a timer that
drifts or silently resets breaks the core in-workout experience.

### VII. SOLID & Dependency Inversion in Implementation Code
All implementation code MUST follow SOLID principles: each module/class MUST have a single
responsibility; higher-level policy code MUST depend on abstractions rather than concrete
implementations (dependency inversion) — this applies with particular force to the chat/coaching
service and to data access, which MUST be reachable through an interface/port the rest of the
system depends on, not called directly by business logic; interfaces exposed to consumers MUST be
segregated by client need rather than one broad general-purpose interface.
**Rationale**: The chat/coaching service and data access layer are the two places most likely to
accumulate infrastructure-specific detail (a specific AI provider's API, a specific database's
query style); inverting the dependency keeps business rules testable and keeps a future provider
or storage change from rippling through the whole codebase.

### VIII. Domain-Driven Boundaries & Ubiquitous Language
Domain logic — how a workout is structured, how a coaching recommendation is derived — MUST be
isolated from Convex/infrastructure code: domain code MUST NOT know or care that Convex is the
database, applying Principle VII's dependency-inversion discipline at the domain level. Workout
tracking and AI coaching MUST be treated as separate bounded contexts with their own domain
models, not one shared model, because they are genuinely different concerns that change at
different rates; where one context's output becomes the other's input (e.g., an accepted coaching
proposal becoming a logged workout), that MUST happen through an explicit translation/mapping
boundary, not by sharing internal types. DDD patterns (entities, value objects, explicit bounded
contexts) MUST be applied where they add clarity, not adopted as ceremony throughout the codebase.
A single ubiquitous language MUST be used consistently across code, specs, and conversation —
canonical terms including Workout, Exercise, Set, and CoachingSession MUST mean the same thing
everywhere, with no synonyms drifting in over time (e.g., no "routine" standing in for Workout, no
"suggestion" standing in for CoachingSession).
**Rationale**: Workout-tracking rules (how sets/reps/timers are structured) and coaching rules
(how a recommendation is derived from history and fatigue) are separately owned concerns; forcing
them into one model or one vocabulary makes each harder to change without breaking the other, and
term drift between spec, code, and conversation is exactly what produces the "wrong assumption"
Principle III exists to prevent.

## Platform & Technology Constraints

- The app MUST be built and delivered as a Progressive Web App: responsive web UI, a valid web
  app manifest, and a service worker providing caching and offline support — not as a native-only
  app. Viewing and running an already-generated workout MUST work without a network connection.
- Workout and log data (exercises, sets, reps, weights, timer/interval configuration, completion
  history) MUST be stored in a well-defined, structured interchange format at the workout-tracking
  / AI-coaching boundary, so any workout an accepted coaching proposal produces can be rendered,
  edited, and later used as history without manual reformatting. This interchange/mapping format
  is a boundary concern (Principle VIII) — it does NOT require the workout-tracking and
  AI-coaching bounded contexts to share one internal domain model, and each context MAY persist
  its own data shape within Convex (Principle VIII, still subject to the single-source-of-truth
  rule below).
- The fatigue signal (Principle II) MUST be computed from the persisted workout log, not from
  ephemeral session state, so it remains accurate and consistent across sessions and devices.
- Frontend MUST be built with React 19 and TypeScript in strict mode, using Vite as the build
  tool, TanStack Router for routing, TanStack Query for server/remote state, Zustand for local UI
  state, and Tailwind CSS for styling.
- PWA delivery (offline caching, installability, service worker) MUST be implemented via
  vite-plugin-pwa and Workbox, satisfying the Progressive Web App constraint above.
- Convex MUST be the single source of truth for all workout logs, exercises, and AI chat history;
  no external files, vaults, or parallel data stores MAY hold this data.
- AI coaching MUST be delivered through the in-app chat interface (Principle I), implemented as a
  Convex action/HTTP endpoint that calls the Claude API server-side, holding the API key there.
  The client MUST NOT call the Claude API directly or hold the API key. Each server-side call MUST
  pass conversation history and recent workout data as context, per Principle I and II.
- v1 MUST ship with no authentication or login/registration flow — a single local user profile per
  installation, consistent with the single-user scope of the current feature set. Introducing
  multi-device sync or multi-user support MUST revisit this constraint as an amendment before
  authentication is added.
- The frontend MUST deploy to Vercel or Cloudflare Pages; the Convex backend deploys via Convex's
  own hosted deployment pipeline. Either static-hosting target is acceptable — the choice MUST NOT
  affect the structured-schema or offline-support constraints above.

## Development Workflow & Quality Gates

- Any change to workout UI components MUST be manually verified against at least one time-driven
  workout type (e.g., HIIT) and one rep-driven workout type (e.g., strength) before merge, per
  Principle V.
- Any change to timer logic MUST be tested against background/lock-screen interruption before
  merge, per Principle VI.
- Any change to the AI chat's workout-generation output format MUST update the shared workout
  schema in the same change, per Platform & Technology Constraints.
- Any change to fatigue-signal computation MUST be validated against representative sample
  workout logs (including sparse/no-history cases) before merge, per Principle II.
- Any change to the AI chat's clarification behavior MUST be reviewed to confirm ambiguous
  inputs still trigger a user-facing question rather than a silent default, per Principle III.
- Dependency and script management MUST use pnpm exclusively; no other package manager's lockfile
  (npm, yarn) MAY be committed.
- Code MUST pass Biome lint and format checks before merge.
- Changes to units or components MUST include Vitest + React Testing Library coverage; changes
  touching a core user flow (chat-to-workout generation, workout execution, timers) MUST update or
  extend the Playwright e2e smoke suite in the same change.
- Any change where domain/business logic (workout structuring rules, coaching-recommendation
  derivation) calls a Convex API directly instead of through an abstraction it depends on MUST be
  refactored or explicitly justified before merge, per Principle VII.
- Any change introducing a reference from workout-tracking code into AI-coaching domain types, or
  vice versa, that bypasses the explicit translation/mapping boundary MUST be refactored before
  merge, per Principle VIII.

## Governance

This constitution supersedes ad hoc practice for AIGYM development; where a prior convention
conflicts with a principle above, the principle above governs. Amendments require a documented
rationale, a version bump per the policy below, and an updated Sync Impact Report in this file.

Versioning policy: MAJOR for backward-incompatible removal or redefinition of a principle, MINOR
for adding a new principle/section or materially expanding guidance, PATCH for clarifications or
wording fixes that don't change enforced behavior.

All feature specs and implementation plans MUST verify compliance with these principles before
implementation begins; any deviation MUST be explicitly justified (e.g., in the plan's Complexity
Tracking section) rather than silently ignored.

**Version**: 1.2.0 | **Ratified**: 2026-08-31 | **Last Amended**: 2026-09-01
