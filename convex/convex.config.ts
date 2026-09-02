import agent from "@convex-dev/agent/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

// ANTHROPIC_API_KEY backs the app's default AI access (FR-022); optional
// because a fresh dev deployment may not have it set yet — ClaudeAiChatProvider
// (convex/chat/claudeAiChatProvider.ts) surfaces a clear "ai_unreachable" result
// rather than crashing if it's absent, per FR-020.
const app = defineApp({
  env: {
    ANTHROPIC_API_KEY: v.optional(v.string()),
    // Defaults to a specific dated model snapshot in claudeAiChatProvider.ts if unset —
    // override here to move to a newer model without a code change.
    ANTHROPIC_MODEL: v.optional(v.string()),
  },
});

app.use(agent);

export default app;
