import { useEffect, useState } from "react";
import { Profile } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, MapPinned } from "lucide-react";
import { api } from "@/lib/api";
import Map from "@/components/Map";
import { Link } from "react-router-dom";
import { formatDisplayDate } from "@/lib/utils";

export default function FiberCutLocations({
  profile,
}: {
  profile: Profile | null;
}) {
  const [cuts, setCuts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [strictGeography, setStrictGeography] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCuts();
  }, []);

  const fetchCuts = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.get("/fiber_cuts");
      if (error) throw error;

      if (data) {
        const cutsWithCoords = data
          .map((cut: any) => ({
            ...cut,
            latitude: cut.lat_coordinates,
            longitude: cut.log_coordinates, // Note: log_coordinates based on DB schema
          }))
          .filter((cut: any) => {
            const lat = Number(cut.latitude);
            const lng = Number(cut.longitude);
            return (
              cut.latitude && cut.longitude && 
              String(cut.latitude).trim() !== "" && String(cut.longitude).trim() !== "" &&
              !isNaN(lat) && !isNaN(lng) &&
              lat > 20 && lat < 50 && lng > 20 && lng < 60 // Allow slightly wider Middle East bounds in base data
            );
          });

        setCuts(cutsWithCoords);
      }
    } catch (error: any) {
      console.error("Error fetching fiber cut map data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const uniqueRegions = Array.from(new Set(cuts.map(item => item.region_cut_type).filter(Boolean))).sort();
  const uniqueYears = Array.from(new Set(cuts.map(item => {
    if (!item.start_date) return null;
    const yearMatch = String(item.start_date).match(/\b(20\d{2})\b/);
    return yearMatch ? yearMatch[1] : null;
  }).filter(Boolean))).sort();
  const uniqueMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const uniqueTypes = Array.from(new Set(cuts.map(item => item.cut_type).filter(Boolean))).sort();

  const filteredCuts = cuts.filter((cut) => {
    const query = search.toLowerCase().trim();

    const matchesSearch = 
      (cut.cut_location && cut.cut_location.toLowerCase().includes(query)) ||
      (cut.reason && cut.reason.toLowerCase().includes(query)) ||
      (cut.supervisors_name && cut.supervisors_name.toLowerCase().includes(query));
      
    const matchesRegion = regionFilter === 'All' || cut.region_cut_type === regionFilter;
    
    const cutYear = cut.start_date ? String(cut.start_date).match(/\b(20\d{2})\b/)?.[1] : null;
    const matchesYear = yearFilter === 'All' || cutYear === yearFilter;
    
    const matchesMonth = monthFilter === 'All' || String(cut.month || '').toUpperCase().startsWith(monthFilter);
    const matchesType = typeFilter === 'All' || cut.cut_type === typeFilter;
    
    const lat = Number(cut.latitude);
    const lng = Number(cut.longitude);
    const isStrictlySyria = lat >= 32.0 && lat <= 37.25 && lng >= 35.7 && lng <= 42.4;
    const matchesGeography = strictGeography ? isStrictlySyria : true;

    return matchesSearch && matchesRegion && matchesYear && matchesMonth && matchesType && matchesGeography;
  });

  const renderPopup = (cut: any) => (
    <div className="p-1 min-w-[200px]">
      <h3 className="font-bold text-sm mb-1 text-orange-600">
        Fiber Cut: {cut.cut_location || "Unknown Location"}
      </h3>
      <p className="text-xs text-gray-600"><strong>Location:</strong> {cut.cut_location}</p>
      <p className="text-xs text-gray-600"><strong>Date:</strong> {formatDisplayDate(cut.start_date)} {cut.start_time || ""}</p>
      <p className="text-xs text-gray-600"><strong>Duration:</strong> {cut.duration || "-"}</p>
      <div className="mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
        <span className="font-semibold block mb-1">Reason:</span>
        {cut.reason || "No reason provided."}
      </div>
      <p className="text-[10px] text-gray-500 mt-2">
        Coordinates: {cut.latitude}, {cut.longitude}
      </p>
      <Link 
        to={`/fiber-cuts/${cut.id}`}
        className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
      >
        View Details &rarr;
      </Link>
    </div>
  );

  const getFiberCutColor = (cut: any) => {
    const type = String(cut.cut_type || '').trim().toLowerCase();
    if (type.includes('backbone')) return '#ec4899'; // pink-500
    if (type.includes('backhaul')) return '#fbbf24'; // amber-400
    return '#64748b'; // slate-500
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col p-6 space-y-4 bg-background transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <MapPinned className="w-10 h-10 text-white drop-shadow-md" />
          <h2 className="text-3xl font-bold tracking-tight text-white dark:text-white uppercase">FIBER CUT MAP</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search location, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full bg-card border-border"
            />
          </div>
          
          <select
            className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="All">All Regions</option>
            {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          
          <select
            className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="All">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          
          <select
            className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="All">All Months</option>
            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          
          <select
            className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground whitespace-nowrap bg-background border border-input rounded-md px-3 py-1.5 h-9 shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            <input 
              type="checkbox" 
              checked={strictGeography} 
              onChange={(e) => setStrictGeography(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Strict Syria Filter
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-1 pt-2 pb-1 shrink-0 text-sm">
        <span className="font-semibold text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ec4899] shadow-sm"></div>
          <span className="text-foreground font-medium">Backbone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#fbbf24] shadow-sm"></div>
          <span className="text-foreground font-medium">Backhaul</span>
        </div>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-border shadow-sm relative z-0">
        <Map sites={filteredCuts} loading={loading} renderPopup={renderPopup} getMarkerColor={getFiberCutColor} />
      </div>
      
      <div className="shrink-0 flex justify-between items-center text-sm text-muted-foreground">
        <span>Showing {filteredCuts.length} cuts on map</span>
      </div>
    </div>
  );
}
 
