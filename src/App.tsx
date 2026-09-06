import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Profile } from "./types";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SitesDirectory from "./pages/SitesDirectory";
import SiteLocations from "./pages/SiteLocations";
import SiteForm from "./pages/SiteForm";
import AuditHistory from "./pages/AuditHistory";
import SlaTrackingPage from "./pages/SlaTrackingPage";
import SlaForm from "./pages/SlaForm";
import FiberCutsPage from "./pages/FiberCutsPage";
import FiberCutForm from "./pages/FiberCutForm";
import FiberCutLocations from "./pages/FiberCutLocations";
import UserManagement from "./pages/UserManagement";
import TicketsPage from "./pages/TicketsPage";
import IncidentsPage from "./pages/IncidentsPage";
import IncidentForm from "./pages/IncidentForm";
import MainLayout from "./layouts/MainLayout";
import AuthRoute from "./components/AuthRoute";

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  const hasPermission = (path: string) => {
    if (profile?.role === "admin") return true;
    return profile?.permissions?.includes(path) || false;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/" />}
        />

        <Route element={<AuthRoute session={session} />}>
          <Route element={<MainLayout profile={profile} />}>
            <Route path="/" element={hasPermission("/") ? <Dashboard profile={profile} /> : <div className="p-8 text-center mt-10">Welcome! You don't have access to the Dashboard. Please select a page from the menu.</div>} />
            
            <Route path="/sites" element={hasPermission("/sites") ? <SitesDirectory profile={profile} /> : <Navigate to="/" />} />
            <Route path="/sites/new" element={hasPermission("/sites") ? <SiteForm /> : <Navigate to="/" />} />
            <Route path="/sites/:id" element={hasPermission("/sites") ? <SiteForm /> : <Navigate to="/" />} />
            
            <Route path="/locations" element={hasPermission("/locations") ? <SiteLocations profile={profile} /> : <Navigate to="/" />} />
            
            <Route path="/sla-tracking" element={hasPermission("/sla-tracking") ? <SlaTrackingPage /> : <Navigate to="/" />} />
            <Route path="/sla-tracking/new" element={hasPermission("/sla-tracking") ? <SlaForm /> : <Navigate to="/" />} />
            <Route path="/sla-tracking/:id" element={hasPermission("/sla-tracking") ? <SlaForm /> : <Navigate to="/" />} />
            
            <Route path="/fiber-cuts" element={hasPermission("/fiber-cuts") ? <FiberCutsPage /> : <Navigate to="/" />} />
            <Route path="/fiber-cuts/new" element={hasPermission("/fiber-cuts") ? <FiberCutForm /> : <Navigate to="/" />} />
            <Route path="/fiber-cuts/:id" element={hasPermission("/fiber-cuts") ? <FiberCutForm /> : <Navigate to="/" />} />
            
            <Route path="/fiber-cut-map" element={hasPermission("/fiber-cut-map") ? <FiberCutLocations profile={profile} /> : <Navigate to="/" />} />
            
            <Route path="/audit" element={hasPermission("/audit") ? <AuditHistory profile={profile} /> : <Navigate to="/" />} />
            
            <Route path="/users" element={profile?.role === 'admin' ? <UserManagement currentUser={profile} /> : <Navigate to="/" />} />
            <Route path="/tickets" element={hasPermission("/tickets") ? <TicketsPage profile={profile} /> : <Navigate to="/" />} />
            
            <Route path="/incidents" element={hasPermission("/incidents") ? <IncidentsPage /> : <Navigate to="/" />} />
            <Route path="/incidents/new" element={hasPermission("/incidents") ? <IncidentForm /> : <Navigate to="/" />} />
            <Route path="/incidents/:id" element={hasPermission("/incidents") ? <IncidentForm /> : <Navigate to="/" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

