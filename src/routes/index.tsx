import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  return <p className="text-slate-400">AIGYM project scaffold — routes land in later PRs.</p>;
}
