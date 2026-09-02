import type { PreferencesRepository } from "../../src/domain/chat/ports";
import type { Preferences } from "../../src/domain/chat/types";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

function toPreferences(doc: Doc<"userPreferences"> | null): Preferences {
  return {
    goals: doc?.goals ?? [],
    equipment: doc?.equipment ?? [],
    injuriesToAvoid: doc?.injuriesToAvoid ?? [],
    unitPreference: doc?.unitPreference ?? "kg",
    aiDataNoticeAcknowledgedAt: doc?.aiDataNoticeAcknowledgedAt ?? null,
  };
}

export class ConvexPreferencesRepository implements PreferencesRepository {
  constructor(private ctx: QueryCtx | MutationCtx) {}

  async get(): Promise<Preferences> {
    const doc = await this.ctx.db.query("userPreferences").first();
    return toPreferences(doc);
  }

  async hasCustomApiKey(): Promise<boolean> {
    const doc = await this.ctx.db.query("userPreferences").first();
    return doc?.customApiKey !== undefined;
  }

  async getCustomApiKeyForServerUseOnly(): Promise<string | null> {
    const doc = await this.ctx.db.query("userPreferences").first();
    return doc?.customApiKey ?? null;
  }

  /** Upserts the singleton row with a partial patch (Convex UI-facing CRUD, not a domain rule). */
  async update(
    patch: Partial<{
      goals: string[];
      equipment: string[];
      injuriesToAvoid: string[];
      unitPreference: "kg" | "lb";
      aiDataNoticeAcknowledgedAt: number;
      customApiKey: string | null;
    }>,
  ): Promise<void> {
    const mutationCtx = this.requireMutationCtx();
    const existing = await mutationCtx.db.query("userPreferences").first();

    const { customApiKey, ...restPatch } = patch;
    const customApiKeyPatch: { customApiKey?: string } =
      customApiKey === null
        ? { customApiKey: undefined }
        : customApiKey !== undefined
          ? { customApiKey }
          : {};

    if (existing) {
      await mutationCtx.db.patch("userPreferences", existing._id, {
        ...restPatch,
        ...customApiKeyPatch,
        updatedAt: Date.now(),
      });
      return;
    }

    await mutationCtx.db.insert("userPreferences", {
      goals: restPatch.goals ?? [],
      equipment: restPatch.equipment ?? [],
      injuriesToAvoid: restPatch.injuriesToAvoid ?? [],
      unitPreference: restPatch.unitPreference ?? "kg",
      aiDataNoticeAcknowledgedAt: restPatch.aiDataNoticeAcknowledgedAt,
      ...customApiKeyPatch,
      updatedAt: Date.now(),
    });
  }

  private requireMutationCtx(): MutationCtx {
    if (!("insert" in this.ctx.db)) {
      throw new Error("ConvexPreferencesRepository: this operation requires a MutationCtx.");
    }
    return this.ctx as MutationCtx;
  }
}
