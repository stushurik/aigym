# Quickstart: AI Workout Tracker

Validates the feature end-to-end against the 5 user stories in [spec.md](./spec.md). This is a
run/validation guide, not an implementation reference — see [data-model.md](./data-model.md) and
[contracts/](./contracts/) for the shapes and function signatures involved.

## Prerequisites

- Node.js + pnpm installed
- A Convex account/project (`npx convex dev` will prompt to create one on first run)
- An Anthropic API key set as a Convex environment variable for the app's default AI access
  (`npx convex env set ANTHROPIC_API_KEY sk-...`) — required for User Story 1 and the cap/BYOK
  scenarios below

## Setup

```bash
pnpm install
npx convex dev        # starts the Convex backend, generates convex/_generated types
pnpm dev               # starts the Vite dev server (separate terminal)
```

Open the printed local URL in a browser. Installing as a PWA (browser's "install app" prompt) is
optional for local validation but recommended once to confirm the manifest/service worker are
wired up.

## Validation scenarios

### 1. Build a workout through AI chat (User Story 1)

1. Open the chat, send a request with a clear goal and constraint (e.g. "30-minute upper body
   strength session, I only have dumbbells").
2. **Expect**: the FR-019 one-time AI-data notice appears before the first request is sent (only
   on the very first chat use); after acknowledging, the AI responds with a structured workout
   proposal (not just prose) — verify via `contracts/chat.md`'s `generateWorkout` return shape.
3. Send a deliberately ambiguous request (e.g. "give me a workout" with no goal/equipment/intensity).
   **Expect**: a `kind: "clarifying_question"` response, not a guessed workout (FR-004).
4. Accept a proposal. **Expect**: it becomes an editable workout, reachable from workout history.

### 2. Run a workout with a type-adaptive UI (User Story 2)

1. Open an accepted strength-type workout. **Expect**: rep/weight entry fields per set.
2. Create (via chat or manually) and open a HIIT/interval-type workout, start it. **Expect**:
   work/rest interval timer UI, not rep/weight fields.
3. While a timer is running, background the tab (switch away) for over a minute, then return.
   **Expect**: displayed remaining/elapsed time matches wall-clock reality (within ~1s), per
   research.md §1 — this is the manual check for SC-004; the Playwright smoke suite should assert
   the same via a simulated `visibilitychange` + clock advance.

### 3. Edit and manage workout entries (User Story 3)

1. On any workout, add a new exercise entry by typing a name close to (but not exactly) an
   existing catalog entry (e.g. different casing/spacing). **Expect**: it resolves to the same
   catalog entry, not a duplicate (FR-021) — verify via `exerciseCatalog.searchCatalog`.
2. Edit an entry's reps/weight/interval values, then remove a different entry. **Expect**: both
   changes persist after leaving and returning to the workout (FR-008, FR-009).
3. Remove every entry from a workout. **Expect**: the workout remains open in an empty state, and
   the UI blocks/confirms before letting the user "start" it in that state (edge case in spec.md).

### 4. Review workout history and preferences (User Story 4)

1. Log/complete a workout, then open the history list. **Expect**: it appears with date, type, and
   summary details, and opening it shows the full logged entries (FR-014).
2. Update a preference (goal, equipment, or an injury/avoidance note) and send a new chat request
   that would plausibly be affected by it. **Expect**: the next AI proposal reflects the change
   (FR-003, FR-016).

### 5. Use previously loaded workouts offline (User Story 5)

1. While online, open a workout so it's cached (per research.md §2).
2. Use the browser devtools to go offline (or disable networking).
3. **Expect**: the previously opened workout still opens, is editable, and its timers still run
   correctly (FR-017, SC-005).
4. Attempt to start a new AI chat request while offline. **Expect**: a clear "requires connection"
   message (FR-017) — the rest of the app remains usable.

### 6. AI failure and usage-cap edge cases (FR-020, FR-022, FR-023, SC-008)

1. Simulate a Claude API failure (e.g. temporarily unset `ANTHROPIC_API_KEY`) and send a chat
   message. **Expect**: a clear error, no automatic retry, and the user can still build/edit the
   workout manually (FR-020).
2. Drive the default-access daily request count up to the configured cap (see
   `contracts/preferences.md`'s `checkAndIncrementDailyCap`). **Expect**: further default-access
   requests are blocked with a clear "cap reached, resets at X / add your own key" message, while
   viewing/editing/running existing workouts remains fully available (SC-008).
3. Configure a custom API key (`preferences.setCustomApiKey`) and repeat step 2. **Expect**: chat
   requests succeed regardless of the default-access cap (FR-023).

## Automated coverage

The above scenarios map 1:1 to the Playwright e2e smoke suite (`tests/e2e/`) required by the
constitution's Development Workflow & Quality Gates; component-level behavior (type-adaptive
rendering, timer math, catalog matching) is covered by Vitest + React Testing Library unit tests
(`tests/unit/`). Both are defined in the implementation tasks, not in this guide.
