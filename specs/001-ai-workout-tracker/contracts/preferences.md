# Contract: Preferences & AI Usage (`convex/preferences.ts`, `convex/aiUsage.ts`)

Supports FR-016, FR-019, FR-022, FR-023, SC-008. Types reference
[`../data-model.md`](../data-model.md).

## `getPreferences` (query)

- **Args**: none
- **Returns**: `{ goals, equipment, injuriesToAvoid, unitPreference, aiDataNoticeAcknowledgedAt, hasCustomApiKey: boolean }`
- **Behavior**: `customApiKey` itself is **never** included in this (or any other) query result —
  only the derived `hasCustomApiKey` boolean, so the client can show configured/not-configured
  state without ever handling the raw key (FR-023)
- **Errors**: none (returns defaults if no preferences row exists yet)

## `updatePreferences` (mutation)

Supports FR-016.

- **Args**: `{ goals?: string[]; equipment?: string[]; injuriesToAvoid?: string[]; unitPreference?: "kg" | "lb" }`
- **Returns**: `void`
- **Errors**: none

## `acknowledgeAiDataNotice` (mutation)

Supports FR-019.

- **Args**: none
- **Returns**: `void`
- **Behavior**: sets `aiDataNoticeAcknowledgedAt` to now, idempotent if already set

## `setCustomApiKey` (mutation)

Supports FR-023.

- **Args**: `{ apiKey: string | null }` (`null` clears it, reverting to the app's default access + cap)
- **Returns**: `void`
- **Behavior**: stores the raw key server-side only; no query ever echoes it back (see
  `getPreferences` above)
- **Errors**: `ValidationError` if `apiKey` is present but obviously malformed (e.g. empty string)

## `checkAndIncrementDailyCap` (mutation, internal — called only from `chat.generateWorkout`)

Supports FR-022, SC-008, research.md §5.

- **Args**: none
- **Returns**: `{ allowed: boolean; remaining: number; resetsAt: number }`
- **Behavior**: reads/creates today's `AiUsage` row; if `count < cap`, increments and returns
  `allowed: true`; otherwise returns `allowed: false` without incrementing
- **Errors**: none
