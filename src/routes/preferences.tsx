import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preferences")({
  component: PreferencesRoute,
});

function PreferencesRoute() {
  return <p className="text-slate-400">Preferences coming soon.</p>;
}
