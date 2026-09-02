import { test as base, expect } from "@playwright/test";

/**
 * Base Playwright fixture for the e2e smoke suite. Re-exported so
 * story-specific specs import from here rather than "@playwright/test"
 * directly, giving us one place to add shared setup (e.g. seeding a
 * Convex deployment) once a story needs it.
 */
export const test = base;
export { expect };
