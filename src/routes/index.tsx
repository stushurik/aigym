import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // The AI chat is the primary interface for workout creation
    // (constitution Principle I) — it's the default landing view.
    throw redirect({ to: "/chat" });
  },
});
