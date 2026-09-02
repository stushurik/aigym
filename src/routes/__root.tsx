import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="flex gap-4 border-b border-slate-800 px-4 py-3 text-sm">
        <Link to="/chat" activeProps={{ className: "text-sky-400" }}>
          Chat
        </Link>
        <Link to="/history" activeProps={{ className: "text-sky-400" }}>
          History
        </Link>
        <Link to="/preferences" activeProps={{ className: "text-sky-400" }}>
          Preferences
        </Link>
      </nav>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
