import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
