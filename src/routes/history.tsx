import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  component: HistoryRoute,
});

function HistoryRoute() {
  return <p className="text-slate-400">Workout history coming soon.</p>;
}
