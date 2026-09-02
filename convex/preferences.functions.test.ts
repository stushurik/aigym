// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("preferences functions", () => {
  test("getPreferences returns defaults with no row and never leaks the raw key", async () => {
    const t = convexTest(schema, modules);

    const defaults = await t.query(api.preferences.functions.getPreferences, {});
    expect(defaults).toEqual({
      goals: [],
      equipment: [],
      injuriesToAvoid: [],
      unitPreference: "kg",
      aiDataNoticeAcknowledgedAt: null,
      hasCustomApiKey: false,
    });

    await t.mutation(api.preferences.functions.setCustomApiKey, { apiKey: "sk-test-123" });
    const afterSet = await t.query(api.preferences.functions.getPreferences, {});
    expect(afterSet.hasCustomApiKey).toBe(true);
    expect(afterSet).not.toHaveProperty("customApiKey");
  });

  test("updatePreferences upserts fields and acknowledgeAiDataNotice sets a timestamp", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.preferences.functions.updatePreferences, {
      goals: ["strength"],
      equipment: ["dumbbells"],
      unitPreference: "lb",
    });
    const afterUpdate = await t.query(api.preferences.functions.getPreferences, {});
    expect(afterUpdate.goals).toEqual(["strength"]);
    expect(afterUpdate.equipment).toEqual(["dumbbells"]);
    expect(afterUpdate.unitPreference).toBe("lb");
    expect(afterUpdate.aiDataNoticeAcknowledgedAt).toBeNull();

    await t.mutation(api.preferences.functions.acknowledgeAiDataNotice, {});
    const afterAck = await t.query(api.preferences.functions.getPreferences, {});
    expect(afterAck.aiDataNoticeAcknowledgedAt).not.toBeNull();
    // The update from before must still be there — acknowledging the notice
    // must not clobber other preference fields.
    expect(afterAck.goals).toEqual(["strength"]);
  });

  test("setCustomApiKey rejects an empty string and clearing with null removes it", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.preferences.functions.setCustomApiKey, { apiKey: "  " }),
    ).rejects.toThrow();

    await t.mutation(api.preferences.functions.setCustomApiKey, { apiKey: "sk-test-456" });
    expect((await t.query(api.preferences.functions.getPreferences, {})).hasCustomApiKey).toBe(
      true,
    );

    await t.mutation(api.preferences.functions.setCustomApiKey, { apiKey: null });
    expect((await t.query(api.preferences.functions.getPreferences, {})).hasCustomApiKey).toBe(
      false,
    );
  });
});
