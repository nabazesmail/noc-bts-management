import { Outlet, Link, useLocation } from "react-router-dom";
import { Profile } from "@/types";
import {
  LayoutDashboard,
  RadioTower,
  Map as MapIcon,
  History,
  ClipboardList,
  LogOut,
  Moon,
  Sun,
  Menu,
  ChevronLeft,
  Scissors,
  MapPinned,
  Users,
  Ticket,
  Flame
} from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";

export default function MainLayout({ profile }: { profile: Profile | null }) {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    localStorage.removeItem("localUser");
    localStorage.removeItem("jwt_token");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/login";
  };

  const allNavItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Site Data", path: "/sites", icon: RadioTower },
    { name: "Site Locations", path: "/locations", icon: MapIcon },
    { name: "SLA Tracking", path: "/sla-tracking", icon: ClipboardList },
    { name: "Fiber Cuts", path: "/fiber-cuts", icon: Scissors },
    { name: "Fiber Cut Map", path: "/fiber-cut-map", icon: MapPinned },
    { name: "Customer Tickets", path: "/tickets", icon: Ticket },
    { name: "Network Incidents", path: "/incidents", icon: Flame },
    { name: "Audit History", path: "/audit", icon: History },
  ];

  const navItems = allNavItems
    .filter((item) => {
      if (profile?.role === "admin") return true;
      if (item.isSystemAdminOnly) return false;
      return profile?.permissions?.includes(item.path);
    })
    .sort((a, b) => {
      if (a.name === "Audit History") return 1;
      if (b.name === "Audit History") return -1;
      return 0;
    });

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground transition-colors">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          {!isCollapsed && (
            <span className="font-extrabold text-xl text-primary tracking-tight truncate">
              NOC MS
            </span>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:scale-105 hover:shadow-sm"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          {/* Admin User Management */}
          {profile?.role === "admin" && (
            <Link
              to="/users"
              title={isCollapsed ? "User Management" : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-md text-sm font-medium transition-colors ${
                location.pathname === "/users"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>User Management</span>}
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={isCollapsed ? "Toggle Theme" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors`}
          >
            <span className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              {!isCollapsed && (theme === 'dark' ? 'Dark Mode' : 'Light Mode')}
            </span>
          </button>

          {!isCollapsed && (
            <div className="px-3 py-2 text-sm font-semibold text-primary truncate">
              {profile?.name || profile?.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 w-full rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-background transition-colors relative">
        <div className="p-6 max-w-[1600px] mx-auto min-h-full">
          <div key={location.pathname} className="animate-fade-in h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

