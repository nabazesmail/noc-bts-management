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
    { name: "Fiber Cuts", path: "/fiber-cuts", icon: Scissors },
    { name: "Fiber Cut Map", path: "/fiber-cut-map", icon: MapPinned },
    { name: "Customer Tickets", path: "/tickets", icon: Ticket },
    { name: "Network Incidents", path: "/incidents", icon: Flame },
    { name: "SLA Tracking", path: "/sla-tracking", icon: ClipboardList },
    { name: "Audit History", path: "/audit", icon: History },
    { name: "User Management", path: "/users", icon: Users, adminOnly: true },
  ];

  const navItems = allNavItems
    .filter((item) => {
      if (item.adminOnly && profile?.role !== "admin") return false;
      if (profile?.role === "admin") return true;
      if (item.adminOnly) return false;
      return profile?.permissions?.includes(item.path);
    });

  const groups = [
    {
      title: "Overview",
      items: navItems.filter(i => ["Dashboard"].includes(i.name))
    },
    {
      title: "Infrastructure",
      items: navItems.filter(i => ["Site Data", "Site Locations", "Fiber Cuts", "Fiber Cut Map"].includes(i.name))
    },
    {
      title: "Operations",
      items: navItems.filter(i => ["Customer Tickets", "Network Incidents", "SLA Tracking"].includes(i.name))
    },
    {
      title: "System",
      items: navItems.filter(i => ["Audit History", "User Management"].includes(i.name))
    }
  ].filter(g => g.items.length > 0);

  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground transition-colors">
      {/* Sidebar */}
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 bg-[#0f172a] dark:bg-[#0f172a] border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="h-[88px] flex items-center justify-between px-5 border-b border-slate-800/50">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img 
                src="/logo-blue-v2.png" 
                alt="NOC Logo"
                className="h-16 w-16 object-contain drop-shadow-md -ml-1 brightness-0 invert"
              />
              <span className="font-extrabold text-2xl tracking-widest text-white translate-y-[10px] drop-shadow-sm font-sans">
                NOC MS
              </span>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.name : undefined}
                    className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600/15 text-white shadow-sm ring-1 ring-blue-500/20"
                        : "text-[#94A3B8] hover:bg-slate-800/50 hover:text-slate-200"
                    }`}
                  >
                    {isActive && !isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
                    )}
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-[#94A3B8] group-hover:text-slate-300'}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          {/* User Profile Card */}
          <div className={`flex flex-col gap-3 ${isCollapsed ? 'items-center' : ''}`}>
            {!isCollapsed ? (
              <div className="flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/80 transition-colors p-2.5 rounded-lg border border-slate-700/50 shadow-sm group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-inner">
                    {(profile?.name || profile?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-sm font-semibold text-slate-100 truncate">
                      {profile?.name || profile?.email}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md inline-block w-max mt-0.5">
                      {profile?.role || 'User'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    title="Toggle Theme"
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md">
                  {(profile?.name || profile?.email || '?').charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title="Toggle Theme"
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
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

