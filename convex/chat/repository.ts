import { createThread, listMessages as agentListMessages, saveMessage } from "@convex-dev/agent";
import type { AiUsagePolicy, ChatConversationRepository } from "../../src/domain/chat/ports";
import type { ChatConversationId, ChatMessage } from "../../src/domain/chat/types";
import { components } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** FR-022: soft daily cap on the app's default AI access — resets naturally at UTC midnight. */
export const DEFAULT_AI_USAGE_DAILY_CAP = 50;

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextUtcMidnight(now: number): number {
  const date = new Date(now);
  date.setUTCHours(24, 0, 0, 0);
  return date.getTime();
}

export class ConvexChatConversationRepository implements ChatConversationRepository {
  constructor(private ctx: QueryCtx | MutationCtx) {}

  async create(): Promise<ChatConversationId> {
    const mutationCtx = this.requireMutationCtx();
    const threadId = await createThread(mutationCtx, components.agent);
    await mutationCtx.db.insert("chatSessions", { threadId, createdAt: Date.now() });
    return threadId;
  }

  async get(
    id: ChatConversationId,
  ): Promise<{ id: ChatConversationId; resultingWorkoutId: string | null } | null> {
    const session = await this.ctx.db
      .query("chatSessions")
      .withIndex("by_threadId", (q) => q.eq("threadId", id))
      .unique();
    if (!session) {
      return null;
    }
    return { id: session.threadId, resultingWorkoutId: session.resultingWorkoutId ?? null };
  }

  async listMessages(id: ChatConversationId): Promise<ChatMessage[]> {
    const result = await agentListMessages(this.ctx, components.agent, {
      threadId: id,
      paginationOpts: { numItems: 100, cursor: null },
      excludeToolMessages: true,
    });
    // Sorted explicitly rather than trusting the SDK's pagination order, which
    // is documented for infinite-scroll UIs (newest page first) and not
    // guaranteed here to be oldest-first.
    return result.page
      .map((doc) => ({
        role: (doc.message?.role === "user" ? "user" : "assistant") as ChatMessage["role"],
        text: doc.text ?? "",
        createdAt: doc._creationTime,
      }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  async appendUserMessage(id: ChatConversationId, content: string): Promise<{ messageId: string }> {
    const mutationCtx = this.requireMutationCtx();
    const { messageId } = await saveMessage(mutationCtx, components.agent, {
      threadId: id,
      prompt: content,
    });
    return { messageId };
  }

  async setResultingWorkoutId(id: ChatConversationId, workoutId: string): Promise<void> {
    const mutationCtx = this.requireMutationCtx();
    const session = await mutationCtx.db
      .query("chatSessions")
      .withIndex("by_threadId", (q) => q.eq("threadId", id))
      .unique();
    if (!session) {
      throw new Error("Chat session not found");
    }
    await mutationCtx.db.patch("chatSessions", session._id, { resultingWorkoutId: workoutId });
  }

  private requireMutationCtx(): MutationCtx {
    if (!("insert" in this.ctx.db)) {
      throw new Error("ConvexChatConversationRepository: this operation requires a MutationCtx.");
    }
    return this.ctx as MutationCtx;
  }
}

export class ConvexAiUsagePolicy implements AiUsagePolicy {
  constructor(private ctx: MutationCtx) {}

  async checkAndIncrementIfUsingDefaultAccess(usingCustomKey: boolean) {
    const now = Date.now();
    const resetsAt = nextUtcMidnight(now);

    if (usingCustomKey) {
      return { allowed: true, remaining: Number.POSITIVE_INFINITY, resetsAt };
    }

    const date = utcDateKey(new Date(now));
    const existing = await this.ctx.db
      .query("aiUsage")
      .withIndex("by_date", (q) => q.eq("date", date))
      .unique();
    const count = existing?.count ?? 0;

    if (count >= DEFAULT_AI_USAGE_DAILY_CAP) {
      return { allowed: false, remaining: 0, resetsAt };
    }

    if (existing) {
      await this.ctx.db.patch("aiUsage", existing._id, { count: count + 1 });
    } else {
      await this.ctx.db.insert("aiUsage", { date, count: 1 });
    }

    return { allowed: true, remaining: DEFAULT_AI_USAGE_DAILY_CAP - (count + 1), resetsAt };
  }
}
