import type {
  ExerciseCatalogRepository,
  ExerciseEntryRepository,
  WorkoutRepository,
} from "../../src/domain/workoutTracking/ports";
import type {
  EntryInput,
  EntryPatch,
  ExerciseEntry,
  ExerciseId,
  Workout,
  WorkoutDraftInput,
  WorkoutId,
  WorkoutStatus,
  WorkoutSummary,
} from "../../src/domain/workoutTracking/types";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

function toWorkout(doc: Doc<"workouts">): Workout {
  return {
    id: doc._id,
    workoutType: doc.workoutType,
    status: doc.status,
    source: doc.source,
    title: doc.title,
    originatingChatConversationId: doc.originatingChatConversationId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt ?? null,
  };
}

function toWorkoutSummary(doc: Doc<"workouts">): WorkoutSummary {
  return {
    id: doc._id,
    workoutType: doc.workoutType,
    status: doc.status,
    source: doc.source,
    title: doc.title,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt ?? null,
  };
}

function toExerciseEntry(doc: Doc<"exerciseEntries">): ExerciseEntry {
  return {
    id: doc._id,
    workoutId: doc.workoutId,
    exerciseCatalogId: doc.exerciseCatalogId,
    order: doc.order,
    strength: doc.strength,
    interval: doc.interval,
    notes: doc.notes,
  };
}

export class ConvexWorkoutRepository implements WorkoutRepository {
  constructor(private ctx: QueryCtx | MutationCtx) {}

  async get(workoutId: WorkoutId): Promise<Workout | null> {
    const doc = await this.ctx.db.get("workouts", workoutId as Id<"workouts">);
    return doc ? toWorkout(doc) : null;
  }

  async list(paginationOpts: { numItems: number; cursor: string | null }) {
    const result = await this.ctx.db.query("workouts").order("desc").paginate(paginationOpts);
    return {
      page: result.page.map(toWorkoutSummary),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  }

  async create(input: Omit<WorkoutDraftInput, "entries">): Promise<WorkoutId> {
    const mutationCtx = this.requireMutationCtx();
    const now = Date.now();
    const id = await mutationCtx.db.insert("workouts", {
      workoutType: input.workoutType,
      status: "draft",
      source: input.source,
      title: input.title,
      originatingChatConversationId: input.originatingChatConversationId,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async setStatus(
    workoutId: WorkoutId,
    status: WorkoutStatus,
    completedAt: number | null,
  ): Promise<void> {
    const mutationCtx = this.requireMutationCtx();
    await mutationCtx.db.patch("workouts", workoutId as Id<"workouts">, {
      status,
      completedAt: completedAt ?? undefined,
      updatedAt: Date.now(),
    });
  }

  async touch(workoutId: WorkoutId): Promise<void> {
    const mutationCtx = this.requireMutationCtx();
    await mutationCtx.db.patch("workouts", workoutId as Id<"workouts">, {
      updatedAt: Date.now(),
    });
  }

  private requireMutationCtx(): MutationCtx {
    if (!("insert" in this.ctx.db)) {
      throw new Error("ConvexWorkoutRepository: this operation requires a MutationCtx.");
    }
    return this.ctx as MutationCtx;
  }
}

export class ConvexExerciseEntryRepository implements ExerciseEntryRepository {
  constructor(private ctx: QueryCtx | MutationCtx) {}

  async get(entryId: string): Promise<ExerciseEntry | null> {
    const doc = await this.ctx.db.get("exerciseEntries", entryId as Id<"exerciseEntries">);
    return doc ? toExerciseEntry(doc) : null;
  }

  async listByWorkout(workoutId: WorkoutId): Promise<ExerciseEntry[]> {
    const docs = await this.ctx.db
      .query("exerciseEntries")
      .withIndex("by_workoutId_and_order", (q) => q.eq("workoutId", workoutId as Id<"workouts">))
      .collect();
    return docs.map(toExerciseEntry);
  }

  async add(workoutId: WorkoutId, exerciseCatalogId: ExerciseId, input: EntryInput, order: number) {
    const mutationCtx = this.requireMutationCtx();
    return await mutationCtx.db.insert("exerciseEntries", {
      workoutId: workoutId as Id<"workouts">,
      exerciseCatalogId: exerciseCatalogId as Id<"exerciseCatalog">,
      order,
      strength: input.strength,
      interval: input.interval,
      notes: input.notes,
    });
  }

  async edit(entryId: string, patch: EntryPatch): Promise<void> {
    const mutationCtx = this.requireMutationCtx();
    await mutationCtx.db.patch("exerciseEntries", entryId as Id<"exerciseEntries">, {
      strength: patch.strength,
      interval: patch.interval,
      notes: patch.notes,
    });
  }

  async remove(entryId: string): Promise<void> {
    const mutationCtx = this.requireMutationCtx();
    await mutationCtx.db.delete("exerciseEntries", entryId as Id<"exerciseEntries">);
  }

  private requireMutationCtx(): MutationCtx {
    if (!("insert" in this.ctx.db)) {
      throw new Error("ConvexExerciseEntryRepository: this operation requires a MutationCtx.");
    }
    return this.ctx as MutationCtx;
  }
}

/** Fuzzy-match candidate pool cap (research.md §4) — bounded per Convex's no-unbounded-collect guideline. */
const CATALOG_FUZZY_MATCH_CANDIDATE_LIMIT = 500;
/** Max normalized Levenshtein distance to treat two exercise names as the same exercise. */
const FUZZY_MATCH_MAX_DISTANCE = 2;

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) distances[i][0] = i;
  for (let j = 0; j < cols; j++) distances[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + cost,
      );
    }
  }

  return distances[rows - 1][cols - 1];
}

export class ConvexExerciseCatalogRepository implements ExerciseCatalogRepository {
  constructor(private ctx: QueryCtx | MutationCtx) {}

  async getById(exerciseId: string): Promise<{ id: ExerciseId; name: string } | null> {
    const doc = await this.ctx.db.get("exerciseCatalog", exerciseId as Id<"exerciseCatalog">);
    return doc ? { id: doc._id, name: doc.name } : null;
  }

  async search(query: string, limit = 20): Promise<{ id: ExerciseId; name: string }[]> {
    const normalizedQuery = normalizeExerciseName(query);
    const docs = await this.ctx.db
      .query("exerciseCatalog")
      .withIndex("by_normalizedName", (q) =>
        q.gte("normalizedName", normalizedQuery).lt("normalizedName", `${normalizedQuery}￿`),
      )
      .take(limit);
    return docs.map((doc) => ({ id: doc._id, name: doc.name }));
  }

  async resolveOrCreate(
    name: string,
    createdBy: "user" | "ai",
  ): Promise<{ id: ExerciseId; created: boolean }> {
    const mutationCtx = this.requireMutationCtx();
    const normalizedName = normalizeExerciseName(name);

    const exactMatch = await mutationCtx.db
      .query("exerciseCatalog")
      .withIndex("by_normalizedName", (q) => q.eq("normalizedName", normalizedName))
      .unique();
    if (exactMatch) {
      return { id: exactMatch._id, created: false };
    }

    const candidates = await mutationCtx.db
      .query("exerciseCatalog")
      .take(CATALOG_FUZZY_MATCH_CANDIDATE_LIMIT);
    let bestMatch: Doc<"exerciseCatalog"> | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const distance = levenshteinDistance(normalizedName, candidate.normalizedName);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }
    if (bestMatch && bestDistance <= FUZZY_MATCH_MAX_DISTANCE) {
      return { id: bestMatch._id, created: false };
    }

    const id = await mutationCtx.db.insert("exerciseCatalog", {
      name: name.trim(),
      normalizedName,
      createdBy,
      createdAt: Date.now(),
    });
    return { id, created: true };
  }

  private requireMutationCtx(): MutationCtx {
    if (!("insert" in this.ctx.db)) {
      throw new Error("ConvexExerciseCatalogRepository: this operation requires a MutationCtx.");
    }
    return this.ctx as MutationCtx;
  }
}
