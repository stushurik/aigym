import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat")({
  component: ChatRoute,
});

function ChatRoute() {
  return <p className="text-slate-400">AI chat coming soon.</p>;
}
