# Feature Specification: AI Workout Tracker

**Feature Branch**: `001-ai-workout-tracker`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "develop AIGYM PWA which keeps track of all logged workouts, helps user to build workout using AI which takes into account previous logs and user preferences, convinient UI that renders workout (workout type is taken into account) and easy to edit (add entries, edit, remove). AIGYM is PWA web app that have ai chat the helps user to build workout through the chat (user can describe his needs and AI should propose excercises or whole workout). All workout should have convinient UI which depict generated workout (it has fields to enter and edit reps, weights, have timer), workout UI adjusted to workout type (e.g. HIIT timers e.t.c)"

## Clarifications

### Session 2026-08-31

- Q: When a user's workout history or preferences (including injury/avoidance notes) are used to generate AI suggestions, should the app show the user an explicit notice/consent step the first time, or is no special handling needed? → A: Show a one-time explicit notice before any data is first sent to the AI provider, no further data minimization
- Q: When the AI chat can't reach its backend or the request fails (timeout, service error), what should the app do? → A: Show a clear error message; user can retry manually or build/edit the workout themselves (no automatic retry or queueing)
- Q: Once a workout is marked completed, should its logged entries stay fully editable, or become read-only? → A: Completed workouts remain fully editable, same as any other workout
- Q: Are exercises tracked against a shared, canonical list, or can each entry be free-text? → A: Canonical catalog that can grow — exercises are matched to a shared list; new names get added to it automatically
- Q: Should there be any limit on how many AI chat requests a user can make, or is usage unlimited in v1? → A: Soft daily/session cap on the app's default AI access, plus the ability for a user to configure their own API key (which is not subject to that cap)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a Workout Through AI Chat (Priority: P1)

A user opens the AI chat and describes what they want in plain language (e.g., "I want a 30-minute upper body strength session, I only have dumbbells" or "give me a hard HIIT workout, my legs are sore from yesterday"). The AI proposes specific exercises — or a full workout — that reflects the user's request, their history of previously logged workouts, and their stated preferences.

**Why this priority**: This is the core value proposition of the product — an AI that builds a relevant workout from a conversation instead of the user assembling one from scratch. Without it, AIGYM is just a workout logger.

**Independent Test**: Can be fully tested by opening the chat, entering a workout request, and confirming the AI returns a structured set of exercises (not just prose) that becomes available to open in the workout UI. Delivers value on its own even before other stories are built.

**Acceptance Scenarios**:

1. **Given** a user with prior logged workouts and stated preferences, **When** they describe a workout goal in the chat, **Then** the AI proposes exercises or a full workout that is consistent with that history and those preferences.
2. **Given** a user with no prior logged workouts, **When** they describe a workout goal in the chat, **Then** the AI still proposes a reasonable workout based on the stated goal alone.
3. **Given** an AI-proposed workout in the chat, **When** the user accepts it, **Then** it becomes available as an editable workout in the workout UI.
4. **Given** a chat request that is ambiguous or missing information that would materially change the workout (e.g., no indication of available equipment or intensity), **When** the user submits it, **Then** the AI asks a clarifying question instead of guessing.

---

### User Story 2 - Run a Workout With a Type-Adaptive UI (Priority: P1)

A user opens a workout (AI-generated or manually created) and works through it. The screen presents the right controls for the workout's type: rep/weight entry fields and a rest timer for a strength workout, or work/rest interval timers for a HIIT workout.

**Why this priority**: This is the moment-of-use experience — it's what the user interacts with during the actual workout, on equal footing with chat-based generation as core value.

**Independent Test**: Can be fully tested by opening a strength-type workout and confirming rep/weight entry and rest-timer controls appear, then opening a HIIT-type workout and confirming work/rest interval timers appear instead. Delivers value independently of whether the workout came from chat or manual entry.

**Acceptance Scenarios**:

1. **Given** an open strength-type workout, **When** the user views an exercise, **Then** they can enter and edit reps and weight for each set.
2. **Given** an open interval/HIIT-type workout, **When** the user starts it, **Then** a work/rest interval timer runs and automatically advances through the configured intervals.
3. **Given** a running timer, **When** the screen locks or the app is backgrounded and later reopened, **Then** the timer reflects the correct remaining/elapsed time as if it had kept running.
4. **Given** a workout of a given type, **When** it is displayed, **Then** only the controls relevant to that type are shown (e.g., no interval timer on a pure strength workout).

---

### User Story 3 - Edit and Manage Workout Entries (Priority: P2)

A user adjusts a workout — whether AI-proposed or previously logged — by adding an exercise the AI missed, editing the sets/reps/weight/interval values, or removing an exercise they don't want to do.

**Why this priority**: AI suggestions and past logs are rarely exactly right; users need full manual control to make the workout usable, but this builds on top of a workout already existing (Stories 1 or a manual entry).

**Independent Test**: Can be fully tested by taking any existing workout, adding a new exercise entry, editing an existing entry's values, and removing an entry — confirming each change is saved.

**Acceptance Scenarios**:

1. **Given** an open workout, **When** the user adds a new exercise entry, **Then** it appears in the workout with editable fields appropriate to the workout type.
2. **Given** an existing exercise entry, **When** the user edits its reps, weight, sets, or interval duration, **Then** the new values are saved and reflected immediately.
3. **Given** an existing exercise entry, **When** the user removes it, **Then** it no longer appears in the workout and is excluded from that workout's saved log.
4. **Given** edits made to a workout, **When** the user leaves and returns to it, **Then** all edits have persisted.

---

### User Story 4 - Review Workout History and Preferences (Priority: P2)

A user browses their past logged workouts and can view or update the preferences (goals, available equipment, injuries/exercises to avoid) that the AI uses when building future workouts.

**Why this priority**: History and preferences are the inputs that make Story 1 work well; users need visibility into and control over what's driving the AI's suggestions, but this is supporting infrastructure rather than the primary interaction.

**Independent Test**: Can be fully tested by logging a workout, then confirming it appears in the history list with its recorded details, and by editing a stated preference and confirming it is saved.

**Acceptance Scenarios**:

1. **Given** one or more completed/logged workouts, **When** the user opens their workout history, **Then** they see a list of past workouts with date, type, and summary details.
2. **Given** a past logged workout, **When** the user opens it from history, **Then** they see the full set of exercises and values as logged.
3. **Given** the preferences section, **When** the user updates a goal, equipment list, or injury/avoidance note, **Then** the change is saved and used in subsequent AI workout proposals.

---

### User Story 5 - Use Previously Loaded Workouts Offline (Priority: P3)

A user without network connectivity (e.g., at a gym with poor signal) opens a workout they had already generated or logged and runs it, including its timers.

**Why this priority**: A workout companion that fails without signal loses trust at the exact moment it's needed most, but this is a resilience layer on top of the core flows above.

**Independent Test**: Can be fully tested by loading a workout while online, then disabling network connectivity and confirming the workout can still be viewed, edited, run, and timed.

**Acceptance Scenarios**:

1. **Given** a workout previously loaded while online, **When** the device goes offline, **Then** the user can still open, view, and run that workout.
2. **Given** no network connectivity, **When** the user edits an already-loaded workout's entries, **Then** the edits are saved locally and preserved.
3. **Given** no network connectivity, **When** the user tries to start a new AI chat request, **Then** the app clearly indicates the AI chat requires a connection, without losing any other offline functionality.

---

### Edge Cases

- What happens when a user asks the AI for a workout while their fatigue signal indicates they need recovery (e.g., high recent training volume)? The AI must factor this in and may propose a lighter session or recovery-focused workout, explaining why if asked.
- How does the system handle a user removing every exercise from a workout, leaving it empty? The workout should be allowed to exist in an empty state rather than error, and should not be presented as ready to run without confirmation.
- How does the AI chat respond to a request for an exercise that conflicts with a user's stated injury/avoidance preference? It must decline or substitute and explain why, rather than silently including it.
- What happens if the user starts running a workout and then edits an entry (e.g., changes reps) mid-session? The change should apply immediately without interrupting any active timer.
- What happens when a work/rest interval timer finishes while the app is in the background? The user should be notified and see the correct current interval when they return to the app.
- What happens when a user has logged workouts but has never described any preferences? The AI should rely on logged history alone and may ask a clarifying question if the request is ambiguous.
- What happens when the AI chat request fails or times out (e.g., the AI service is unreachable)? The system MUST show a clear error message; the user can retry manually or build/edit the workout themselves — no automatic retry or request queueing.
- What happens when a user without a custom API key reaches the default AI usage cap? The AI chat MUST clearly indicate the cap was reached and when it resets, and MUST offer configuring a custom API key as a way to continue immediately; all non-AI functionality remains fully available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an AI chat interface where users describe workout needs in natural language and receive proposed exercises or a complete proposed workout.
- **FR-002**: AI-generated workout proposals MUST take the user's previously logged workout history into account when forming suggestions.
- **FR-003**: AI-generated workout proposals MUST take the user's stated preferences (e.g., goals, available equipment, injuries/exercises to avoid) into account when forming suggestions.
- **FR-004**: The AI chat MUST ask a clarifying question, rather than silently assuming, whenever a request is ambiguous or missing information that would materially change the resulting workout.
- **FR-005**: System MUST derive an ongoing fatigue/recovery indicator from the user's logged workout history and factor it into AI-generated suggestions, avoiding high-intensity recommendations when the signal indicates a need for recovery.
- **FR-006**: Users MUST be able to accept an AI-proposed workout, turning it into an editable workout in the workout UI.
- **FR-007**: Users MUST be able to add new exercise entries to any workout, whether AI-generated or manually created.
- **FR-008**: Users MUST be able to edit any existing exercise entry's values (e.g., sets, reps, weight, interval duration) in any workout.
- **FR-009**: Users MUST be able to remove any exercise entry from any workout.
- **FR-009a**: Editing (add, edit, remove) MUST remain available for a workout regardless of its status, including workouts already marked completed — there is no read-only or archival state.
- **FR-010**: The workout UI MUST adapt its displayed fields and controls to the workout's type — e.g., presenting sets/reps/weight entry for strength-type workouts and work/rest interval timers for HIIT/interval-type workouts.
- **FR-011**: System MUST provide a running timer for time-based workout segments (e.g., HIIT work/rest intervals, rest between sets) that the user can start, pause, and reset.
- **FR-012**: Timer state MUST remain accurate through app backgrounding, screen lock, or device sleep, and MUST resume showing the correct remaining/elapsed time when the user returns.
- **FR-013**: System MUST persist every logged workout (exercises, sets, reps, weights, timing/interval configuration, date, and workout type) so it can be reviewed later and used as input to future AI suggestions.
- **FR-014**: Users MUST be able to view a history of their past logged workouts, including opening any individual past workout to see its full recorded details.
- **FR-015**: Users MUST be able to manually create a new workout and its entries without going through the AI chat.
- **FR-016**: Users MUST be able to record and update their stated preferences (goals, available equipment, injuries/exercises to avoid), and the system MUST use the current values in subsequent AI suggestions.
- **FR-017**: The application MUST be installable and usable as a Progressive Web App; previously loaded workouts MUST remain viewable, editable, and runnable (including timers) without a network connection, while starting a new AI chat request MUST require connectivity and communicate that requirement clearly when offline.
- **FR-018**: The system MUST support a single user profile per installation, with no login/registration flow required; all logged workouts and preferences are scoped to that one local profile.
- **FR-019**: The system MUST show the user a one-time explicit notice, before the first time any workout history or preference data (including injury/avoidance notes) is sent to the AI provider, informing them that this data is used to generate suggestions.
- **FR-020**: When an AI chat request fails or times out (e.g., the AI service is unreachable), the system MUST show a clear error message and allow the user to retry manually or build/edit the workout themselves, without automatic retries or request queueing.
- **FR-021**: Exercise entries MUST be matched against a shared, growing exercise catalog rather than stored as unrelated free text; when the user or the AI introduces an exercise name not yet in the catalog, the system MUST add it, so the same exercise resolves to one consistent identity across a user's workouts and history.
- **FR-022**: The system MUST enforce a soft daily cap on AI chat requests made through the app's default AI access. Once the cap is reached, the system MUST warn the user and block further AI requests until the cap resets, while leaving all other functionality (viewing, editing, and running existing workouts) unaffected.
- **FR-023**: Users MUST be able to configure their own AI provider API key in preferences. When a user-supplied key is configured, the system MUST use it for that user's AI requests instead of the app's default access, and the daily cap in FR-022 MUST NOT apply to those requests. A user-supplied key MUST be stored and used server-side only, consistent with the platform's server-side AI integration — the client MUST NOT transmit or expose the key to anything other than the app's own backend.

### Key Entities

- **Workout**: A single workout session, either AI-generated, manually created, or a completed log entry. Has a workout type, creation/logged date, status (draft/in-progress/completed), and an ordered list of exercise entries. Status does not restrict editability — a completed workout remains fully editable, the same as any other workout.
- **Exercise Entry**: One exercise within a workout. References an exercise from the Exercise Catalog (not a free-text name), and has an order/sequence plus type-appropriate values — sets/reps/weight for strength-oriented exercises, and/or work/rest interval durations for time-driven exercises.
- **Exercise Catalog**: The shared, growing list of known exercises a user or the AI can reference by name. Grows automatically when a new exercise name is introduced, giving every exercise a single consistent identity across a user's workouts, history, and the fatigue signal.
- **Workout Type**: A classification (e.g., strength, HIIT/interval, cardio, circuit) that determines which fields and timer controls the workout UI presents.
- **User Preferences**: The user's stated goals, available equipment, and injuries/exercises to avoid, used as input to AI-generated suggestions. Also holds the optional user-supplied AI provider API key and the current status of the default-access daily AI usage cap.
- **Fatigue/Recovery Signal**: A derived indicator computed from recent logged workout volume, intensity, and frequency, used to steer AI suggestions away from overtraining.
- **Chat Conversation**: The sequence of messages between the user and the AI used to negotiate and refine a proposed workout before it is accepted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from opening the AI chat to having an accepted, ready-to-run workout in under 3 minutes for a typical request.
- **SC-002**: At least 90% of AI-generated workouts require no more than minor edits (e.g., adjusting weight/reps on individual entries, not adding/removing whole exercises) before a user starts them.
- **SC-003**: A user can add, edit, or remove a single exercise entry in under 15 seconds.
- **SC-004**: A running workout timer (interval or rest timer) stays within 1 second of accurate elapsed/remaining time over a 30-minute session, including through at least one screen-lock or backgrounding event.
- **SC-005**: 100% of previously loaded workout data (viewing, editing, running, timing) remains available and functional while offline.
- **SC-006**: At least 95% of first-time users successfully complete and save a logged workout without external help.
- **SC-007**: Users whose recent logged training volume is high receive AI suggestions that measurably shift toward lower intensity or recovery-oriented content compared to suggestions given after a rest period.
- **SC-008**: Reaching the default AI usage cap never blocks viewing, editing, or running existing workouts — only new AI chat requests are affected until the cap resets or a custom API key is configured.

## Assumptions

- The application is a single-user, personal workout companion for v1 — no multi-user accounts, login, or per-user data isolation is required; all data is scoped to one local profile per installation.
- Standard workout types for v1 are strength, HIIT/interval, and cardio; each new workout type introduced later will define its own UI mapping before being exposed to users, per the adaptive-UI requirement.
- The AI chat requires network connectivity to generate new proposals; all other functionality (viewing, editing, running, and timing already-loaded workouts) must work fully offline as a Progressive Web App.
- Units of measurement (e.g., kg vs. lb) default to a sensible locale-based default and are treated as a user preference, not a separate scoped feature.
- "Previously logged workout history," for the purposes of AI suggestions and the fatigue signal, refers to workouts completed and saved within this application, not imported from external fitness trackers.
