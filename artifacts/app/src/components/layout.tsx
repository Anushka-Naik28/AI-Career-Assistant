import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Briefcase, Map as MapIcon, Mic, UserRound } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Resume", href: "/resume", icon: FileText },
    { name: "Job Match", href: "/job-match", icon: Briefcase },
    { name: "Roadmap", href: "/roadmap", icon: MapIcon },
    { name: "Interview", href: "/interview", icon: Mic },
    { name: "Portfolio", href: "/portfolio", icon: UserRound },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background dark:bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">C</div>
            Copilot
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
            return (
              <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-14 border-b border-border flex items-center px-4 md:hidden bg-card">
          <h1 className="text-lg font-bold text-primary">Copilot</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
