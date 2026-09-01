# Phase 0 Research: AI Workout Tracker

All entries in the plan's Technical Context are fixed by the project constitution (v1.1.0) — there
are no outstanding `NEEDS CLARIFICATION` markers. This document instead resolves the *how*: the
best-practice approach for each nontrivial technical decision the chosen stack still leaves open.

## 1. Reliable in-workout timing through backgrounding (Principle VI, FR-012, SC-004)

**Decision**: Compute all timer displays from wall-clock timestamps (`targetEndTime = Date.now() +
remainingMs`, redrawn on each tick as `targetEndTime - Date.now()`), not from a `setInterval` tick
counter. Persist `targetEndTime` (and paused-state `remainingMs`) to Zustand with a
`localStorage`-backed store so it survives a tab reload. Use the Page Visibility API
(`visibilitychange`) to recompute elapsed time immediately when the tab regains focus, and register
a Web Notification (via the service worker, if permission is granted) scheduled for interval/rest
boundaries so a backgrounded/locked session still surfaces the transition.

**Rationale**: `setInterval` timers throttle or stop entirely when a tab is backgrounded or the
screen locks — the single most common way in-workout timers silently drift, which is exactly the
failure mode Principle VI forbids. Deriving remaining/elapsed time from an absolute timestamp is
immune to throttling: whenever the tick resumes (or the page reloads), the correct value is a
single subtraction away, not a replayed count of missed ticks.

**Alternatives considered**:
- Plain `setInterval` with a tick counter — rejected: drifts/stalls exactly when backgrounded, the
  scenario SC-004 explicitly tests.
- Web Worker-driven timer — considered for background tick precision, but still doesn't survive
  full tab discard/backgrounding on mobile Safari, and adds complexity beyond what the
  timestamp-based approach already solves. Not needed for v1.
- Wake Lock API to keep the screen on during a workout — worth adding as a UX nicety (request
  during an active timer, release on pause/finish) but not load-bearing for correctness, since the
  timestamp approach doesn't depend on the screen staying on.

## 2. Offline availability for previously loaded workouts on a reactive backend (FR-017, SC-005)

**Decision**: Layer `vite-plugin-pwa` (Workbox, `injectManifest` or `generateSW` strategy) for
static asset/app-shell caching and installability, plus a persisted TanStack Query cache (e.g. the
`@tanstack/query-persist-client-core` + IndexedDB persister) keyed on Convex query results. Every
workout the user has opened while online is written into this persisted cache; workout-detail and
active-session routes read from the persisted cache first and only reconcile with a live Convex
subscription when connectivity is present.

**Rationale**: Convex's live-query client is online-first by design (it syncs over a WebSocket),
so offline support has to be built as an explicit read-through cache rather than assumed from the
backend. Reusing TanStack Query (already in the stack for server-state) as the persistence layer
avoids introducing a second client-side data-access pattern.

**Alternatives considered**:
- Rely on Convex's built-in client cache alone — rejected: it is memory-only and does not survive
  a reload or a fully offline cold start, which SC-005 requires.
- Hand-rolled IndexedDB read/write per entity — rejected: duplicates what the TanStack Query
  persister already does, for no benefit at this scale.

## 3. AI-generated structured workouts via server-side Claude action (Principle I, FR-001–FR-005)

**Decision**: The Convex `chat.generateWorkout` action calls the Claude API with tool use / a JSON
schema for the response shape (workout type, list of exercises with catalog references, sets/reps/
weight or work/rest interval fields), plus a system prompt embedding: the current exercise catalog
(for name matching), the user's recent workout history summary, the fatigue signal, and stated
preferences. If the model's structured response includes a `clarifying_question` field instead of
a workout, the action returns that to the chat UI unresolved (Principle III / FR-004) rather than
auto-selecting a default.

**Rationale**: Constraining the model to a declared schema (rather than parsing free-form prose)
is what makes FR-001's "structured, not free-form-prose-only" requirement reliably testable, and is
required for the result to populate the same `Workout`/`ExerciseEntry` shapes the rest of the app
uses (Platform & Technology Constraints: shared structured schema).

**Alternatives considered**:
- Freeform text completion + a separate parsing step — rejected: adds a fragile parsing layer and
  doesn't naturally support a clarifying-question branch in the same response contract.

## 4. Exercise catalog identity and matching (FR-021)

**Decision**: Store each catalog entry with a canonical `name` and a normalized-name field
(lowercased, whitespace-collapsed) used for exact-match lookup first; if no exact normalized match
exists, fall back to a lightweight fuzzy match (e.g. Levenshtein distance under a small threshold,
or a trigram similarity check) before creating a new entry, to reduce near-duplicate catalog
growth (e.g. "Bench Press" vs "bench press "). The Claude action is given the current catalog as
context so it prefers existing names; the mutation layer still runs the same match-or-create logic
for names typed directly by the user, so both paths converge on one identity rule.

**Rationale**: FR-021 requires "one consistent identity" for the same exercise across a user's
history — a hard `name === name` string check is too brittle for both AI-generated and manually
typed names to reliably converge on the same catalog entry.

**Alternatives considered**:
- Free-text with no catalog (rejected by the clarification answer, FR-021).
- Fixed, closed catalog with no growth — rejected by the clarification answer (the app must allow
  new exercise names to be added automatically).

## 5. Soft AI usage cap with bring-your-own-key bypass (FR-022, FR-023, SC-008)

**Decision**: An `aiUsage` Convex table keyed by date (`YYYY-MM-DD`) with a request counter, checked
and atomically incremented by a mutation at the start of `chat.generateWorkout`. If the user has a
custom API key configured in `preferences` (server-side field, never sent to the client), the cap
check is skipped entirely for that request and the action uses the user's key instead of the app's
default. The daily counter needs no explicit reset job — a new date key naturally starts at zero.

**Rationale**: This satisfies FR-022 (cap on default access) and FR-023 (BYOK bypasses the cap)
with a single small table and no scheduled job, keeping the mechanism as simple as the spec's scope
calls for.

**Alternatives considered**:
- A cron-based nightly reset of a single counter — rejected: date-keyed rows are simpler and avoid
  a scheduled function whose failure would silently break the cap.

## 6. Fatigue/recovery signal computation (Principle II, FR-005, SC-007)

**Decision**: Compute the signal on read (a Convex query, not a stored/derived table) from the
user's recent `workouts` — e.g. an exponentially-weighted rolling training-load estimate (recent
volume × intensity, decayed by recency), consistent with the widely used acute:chronic workload
ratio concept from sports science. No persistent audit table is introduced for v1; SC-007's
"measurable shift" is validated against test fixtures (representative sample workout logs) during
implementation and QA rather than via a runtime audit log, since the spec does not require one.

**Rationale**: Computing on read keeps the fatigue signal always consistent with the latest logged
workout (Platform & Technology Constraints: "computed from the persisted workout log, not ephemeral
session state") without adding a denormalized table that has to be kept in sync.

**Alternatives considered**:
- Precomputed/cached fatigue snapshot updated on every workout write — rejected as premature for
  v1's data volume (single local user); adds sync-consistency risk for no measured performance
  need.
