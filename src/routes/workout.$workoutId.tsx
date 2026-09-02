import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workout/$workoutId")({
  component: WorkoutRoute,
});

function WorkoutRoute() {
  const { workoutId } = Route.useParams();
  return <p className="text-slate-400">Workout {workoutId} coming soon.</p>;
}
