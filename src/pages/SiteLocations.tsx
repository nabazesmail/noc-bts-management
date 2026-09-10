import { useEffect, useState } from "react";
import { Profile } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, Map as MapIcon } from "lucide-react";
import { api } from "@/lib/api";
import Map from "@/components/Map";

export default function SiteLocations({
  profile,
}: {
  profile: Profile | null;
}) {
  const [sites, setSites] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [b20StatusFilter, setB20StatusFilter] = useState("All");
  const [b7StatusFilter, setB7StatusFilter] = useState("All");
  const [bandFilter, setBandFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketVisibility, setTicketVisibility] = useState("all"); // hidden, open, closed, all
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: "", region: "", latitude: "", longitude: "" });
  const [deleteLocationId, setDeleteLocationId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Read coordinates from URL if provided (for zooming from Tickets page)
  const searchParams = new URLSearchParams(window.location.search);
  const initialLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
  const initialLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
  const initialZoom = searchParams.get('zoom') ? Number(searchParams.get('zoom')) : null;
  
  const forceCenter: [number, number] | undefined = initialLat && initialLng ? [initialLat, initialLng] : undefined;
  const forceZoom: number | undefined = initialZoom || undefined;

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);

    try {
      // 1. Fetch all sites
      const { data: sitesData, error: sitesError } = await api.get("/sites");

      if (sitesError) throw sitesError;

      // 2. Fetch all locations separately (bypassing the relation error)
      const { data: locationsData, error: locationsError } = await api.get("/site_locations");

      if (locationsError) {
        console.warn(
          "Could not fetch site_locations. Check table name.",
          locationsError,
        );
      }

      // 3. Manually merge the coordinates into the sites array
      if (sitesData) {
        const sitesWithCoords = sitesData
          .map((site: any) => {
            // Find matching location by site_code or site_id
            const loc = locationsData?.find(
              (l: any) =>
                l.name === site.site_code || l.site_code === site.site_code || l.site_id === site.id,
            );

            return {
              ...site,
              location_id: loc?.id,
              // Extract coordinates safely
              latitude: loc?.latitude || loc?.lat || site.latitude || site.lat,
              longitude:
                loc?.longitude || loc?.long || site.longitude || site.long,
            };
          })
          .filter((site: any) => {
            const cleanLat = String(site.latitude).replace(/[^0-9.-]/g, '');
            const cleanLng = String(site.longitude).replace(/[^0-9.-]/g, '');
            const lat = Number(cleanLat);
            const lng = Number(cleanLng);
            
            if (site.latitude) site.latitude = cleanLat;
            if (site.longitude) site.longitude = cleanLng;

            return (
              site.latitude && site.longitude &&
              String(site.latitude).trim() !== "" && String(site.longitude).trim() !== "" &&
              !isNaN(lat) && !isNaN(lng) &&
              lat > 20 && lat < 50 && lng > 20 && lng < 60
            );
          }); // Only keep sites with valid coordinates in region

        setSites(sitesWithCoords);
      }

      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await api.get("/tickets");

      if (ticketsError) {
        console.warn("Could not fetch tickets.", ticketsError);
      } else if (ticketsData) {
        setTickets(ticketsData);
      }

    } catch (error: any) {
      console.error("Error fetching map data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      alert("Please fill in the Site Code, Latitude, and Longitude.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await api.post("/site_locations", newLocation);
      if (error) {
        alert("Failed to add location: " + error.message);
      } else {
        setIsAddModalOpen(false);
        setNewLocation({ name: "", region: "", latitude: "", longitude: "" });
        fetchSites();
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteLocation = (locationId: number) => {
    setDeleteLocationId(locationId);
  };

  const executeDeleteLocation = async () => {
    if (deleteLocationId === null) return;
    setIsDeleting(true);
    try {
      const { error } = await api.delete(`/site_locations/${deleteLocationId}`);
      if (error) {
        alert("Failed to delete location: " + error.message);
      } else {
        fetchSites();
        setDeleteLocationId(null);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getBandStatus = (site: any, band: 'B20' | 'B7') => {
    const siteComm = site.comments?.toLowerCase() || '';
    if (siteComm.includes('dismantled')) return "Off-Air (Dismantled)";
    if (siteComm.includes('out of service') || siteComm.includes('turned off') || siteComm.includes('off air') || siteComm.includes('stolen')) {
      return "Off-Air (Site Level)";
    }

    const enodb = band === 'B20' ? (site.enodb_20 || '') : (site.enodb_7 || '');
    const ip = band === 'B20' ? (site.band_20_ip || '') : (site.band_7_ip || '');
    const date = band === 'B20' ? (site.b20_on_air_date || '') : (site.b7_on_air_date || '');
    
    const e = enodb.toLowerCase().trim();
    if (e.includes('dismantled')) return "Off-Air (Dismantled)";
    if (e.includes('out of service')) return "Off-Air (Out of Service)";
    if (e.includes('not on air') || e.includes('off air') || e === '-') {
      if ((!ip || ip === '-') && (!date || date === '-')) {
        return "Not On-Air (Missing Data)";
      }
      return "Off-Air"; 
    }

    if (e || (ip && ip !== '-') || (date && date !== '-')) {
      return "On-Air";
    }

    return "Not On-Air (Missing Data)";
  };

  const getSiteStatus = (site: any) => {
    const comm = site.comments?.toLowerCase() || '';
    const enb20 = site.enodb_20?.toLowerCase() || '';
    const enb7 = site.enodb_7?.toLowerCase() || '';

    if (comm.includes('dismantled')) {
      return "Off-Air (Dismantled)";
    }
    if (comm.includes('out of service') || enb20.includes('out of service') || enb7.includes('out of service')) {
      return "Off-Air (Out of Service)";
    }
    if (comm.includes('turned off') || comm.includes('off air') || comm.includes('stolen')) {
      return "Off-Air";
    }
      
    return "On-Air";
  };

  const getBandType = (site: any) => {
    const status = getSiteStatus(site);
    if (status !== "On-Air") return "-";

    const checkBand = (enodb: string | null, ip: string | null, date: string | null) => {
      const e = enodb?.toLowerCase().trim() || '';
      const i = ip?.toLowerCase().trim() || '';
      const d = date?.toLowerCase().trim() || '';
      
      if (e === 'not on air' || e === 'out of service' || e === '-') return false;
      if (e) return true;
      if (i && i !== '-') return true;
      if (d && d !== '-') return true;
      return false;
    };

    const hasB20 = checkBand(site.enodb_20, site.band_20_ip, site.b20_on_air_date);
    const hasB7 = checkBand(site.enodb_7, site.band_7_ip, site.b7_on_air_date);
    
    if (hasB20 && hasB7) return "Dual-Band";
    if (hasB20) return "Single-Band (B20)";
    if (hasB7) return "Single-Band (B7)";
    return "-";
  };

  const parseSiteDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const s = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-');
      return new Date(parseInt(y), parseInt(m)-1, parseInt(d)).getTime();
    }
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d).getTime();
    }
    if (/^\d{4}$/.test(s)) return new Date(parseInt(s, 10), 0, 1).getTime();
    return null;
  };

  // Filter sites based on the search input and dropdowns
  const filteredSites = sites.filter((site) => {
    const query = search.toLowerCase().trim();
    const isIPSearch = /^[\d\.]+$/.test(query);

    const matchesStandard = 
      (site.site_name && site.site_name.toLowerCase().includes(query)) ||
      (site.site_code && site.site_code.toLowerCase().includes(query)) ||
      (site.site_no && String(site.site_no).toLowerCase().includes(query)) ||
      (site.b20_on_air_date && site.b20_on_air_date.toLowerCase().includes(query)) ||
      (site.b7_on_air_date && site.b7_on_air_date.toLowerCase().includes(query));

    let matchesIP = false;
    const b20 = site.band_20_ip?.toLowerCase().trim() || '';
    const b7 = site.band_7_ip?.toLowerCase().trim() || '';

    if (isIPSearch && query.length > 0) {
      matchesIP = b20 === query || b20.startsWith(query + '.') || 
                  b7 === query || b7.startsWith(query + '.');
    } else {
      matchesIP = b20.includes(query) || b7.includes(query);
    }

    const matchesSearch = matchesStandard || matchesIP;
      
    const isRoadCoverage = site.site_code ? site.site_code.split('#')[0].includes('-') : false;
    const matchesRegion = regionFilter === "All" || 
                          (regionFilter === "Road Coverage" ? isRoadCoverage : (site.region && site.region.toString() === regionFilter));
    
    const b20Status = getBandStatus(site, 'B20');
    const b7Status = getBandStatus(site, 'B7');
    
    const matchesB20Status = b20StatusFilter === "All" || 
                          (b20StatusFilter === "Off-Air" && b20Status?.startsWith("Off-Air")) || 
                          b20Status === b20StatusFilter;
                          
    const matchesB7Status = b7StatusFilter === "All" || 
                          (b7StatusFilter === "Off-Air" && b7Status?.startsWith("Off-Air")) || 
                          b7Status === b7StatusFilter;

    const matchesStatus = matchesB20Status && matchesB7Status;

    const bandType = getBandType(site);
    const isCombined = bandType === "Dual-Band" && !!site.combined_both_bands && site.combined_both_bands.trim() !== '' && site.combined_both_bands.trim() !== '-';
    
    const matchesBand = bandFilter === "All" ||
                        (bandFilter === "Single-Band (Any)" && bandType.startsWith("Single-Band")) ||
                        (bandFilter === "Combined" && isCombined) ||
                        bandType === bandFilter;
                          
    const getYear = (dateStr: string | null) => {
        const t = parseSiteDate(dateStr);
        return t ? new Date(t).getFullYear().toString() : null;
    };
    const getMonth = (dateStr: string | null) => {
        const t = parseSiteDate(dateStr);
        return t ? new Date(t).getMonth().toString() : null;
    };

    const b20Year = getYear(site.b20_on_air_date);
    const b7Year = getYear(site.b7_on_air_date);
    const matchesYear = yearFilter === "All" || (b20Year === yearFilter || b7Year === yearFilter);

    const b20Month = getMonth(site.b20_on_air_date);
    const b7Month = getMonth(site.b7_on_air_date);
    const matchesMonth = monthFilter === "All" || (b20Month === monthFilter || b7Month === monthFilter);

    const lat = Number(site.latitude);
    const lng = Number(site.longitude);
    return matchesSearch && matchesRegion && matchesStatus && matchesBand && matchesYear && matchesMonth;
  });

  const filteredTickets = tickets.filter(ticket => {
    const query = search.toLowerCase();
    return (
      (ticket.city && ticket.city.toLowerCase().includes(query)) ||
      (ticket.region && ticket.region.toLowerCase().includes(query)) ||
      (ticket.description && ticket.description.toLowerCase().includes(query))
    );
  });

  const mapData = [
    ...filteredSites,
    ...(ticketVisibility !== "hidden" 
        ? filteredTickets
            .filter(t => ticketVisibility === "all" || t.status === ticketVisibility)
            .map(t => ({...t, is_ticket: true})) 
        : [])
  ];

  const yearsSet = new Set<number>();
  sites.forEach(site => {
    const t20 = parseSiteDate(site.b20_on_air_date);
    if (t20) yearsSet.add(new Date(t20).getFullYear());
    const t7 = parseSiteDate(site.b7_on_air_date);
    if (t7) yearsSet.add(new Date(t7).getFullYear());
  });
  const availableYears = Array.from(yearsSet).sort();
  
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-3">
          <MapIcon className="w-10 h-10 text-slate-800 dark:text-white drop-shadow-md" />
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">SITE LOCATIONS</h2>
        </div>

        <div className="flex flex-row overflow-x-auto items-center gap-2.5 w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
          {/* Search Bar */}
          <div className="relative w-56 sm:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by IP, Date, Name..."
              className="pl-9 h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>


          <select
            className="flex h-10 w-36 shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-gray-900 dark:border-gray-800"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="All">All Regions</option>
            <option value="Road Coverage">Road Coverage</option>
            {Array.from(new Set(sites.map(s => s.region).filter(Boolean))).sort().map(region => (
              <option key={region} value={region}>
                {region.toString().length === 1 ? `Region ${region}` : region}
              </option>
            ))}
          </select>

          <select
            className="flex h-10 w-36 shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-gray-900 dark:border-gray-800"
            value={b20StatusFilter}
            onChange={(e) => setB20StatusFilter(e.target.value)}
          >
            <option value="All">B20 Status</option>
            <option value="On-Air">On-Air (Working)</option>
            <option value="Off-Air">Off-Air (Any Reason)</option>
            <option value="Off-Air (Dismantled)">Off-Air (Dismantled)</option>
            <option value="Off-Air (Out of Service)">Off-Air (Out of Service)</option>
          </select>

          <select
            className="flex h-10 w-36 shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-gray-900 dark:border-gray-800"
            value={b7StatusFilter}
            onChange={(e) => setB7StatusFilter(e.target.value)}
          >
            <option value="All">B7 Status</option>
            <option value="On-Air">On-Air (Working)</option>
            <option value="Off-Air">Off-Air (Any Reason)</option>
            <option value="Off-Air (Dismantled)">Off-Air (Dismantled)</option>
            <option value="Off-Air (Out of Service)">Off-Air (Out of Service)</option>
          </select>

          <select
            className="flex h-10 w-36 shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:bg-gray-900 dark:border-gray-800"
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value)}
          >
            <option value="All">All Bands</option>
            <option value="Dual-Band">Dual-Band</option>
            <option value="Combined">Combined</option>
            <option value="Single-Band (Any)">Single-Band (Any)</option>
            <option value="Single-Band (B20)">Single-Band (B20)</option>
            <option value="Single-Band (B7)">Single-Band (B7)</option>
          </select>


          <select
            className="flex h-10 shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-900 dark:border-gray-800"
            value={ticketVisibility}
            onChange={(e) => setTicketVisibility(e.target.value)}
          >
            <option value="hidden">Hide Tickets</option>
            <option value="open">Show Open Tickets</option>
            <option value="closed">Show Closed Tickets</option>
            <option value="all">Show All Tickets</option>
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 rounded-md text-sm font-medium transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm relative">
        <Map 
          sites={mapData} 
          loading={loading}
          onDeleteLocation={confirmDeleteLocation}
          forceCenter={forceCenter}
          forceZoom={forceZoom}
        />
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Add Site Location</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddLocation} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Site Code *</label>
                <Input
                  required
                  placeholder="e.g. AM-SUL#1"
                  value={newLocation.name}
                  onChange={e => setNewLocation({...newLocation, name: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">Must exactly match the Site Code in the directory</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Region</label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={newLocation.region}
                  onChange={e => setNewLocation({...newLocation, region: e.target.value})}
                >
                  <option value="">Select Region</option>
                  <option value="1">Region 1</option>
                  <option value="2">Region 2</option>
                  <option value="3">Region 3</option>
                  <option value="4">Region 4</option>
                  <option value="RC">RC</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude *</label>
                  <Input
                    required
                    placeholder="35.xxxx"
                    value={newLocation.latitude}
                    onChange={e => setNewLocation({...newLocation, latitude: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude *</label>
                  <Input
                    required
                    placeholder="45.xxxx"
                    value={newLocation.longitude}
                    onChange={e => setNewLocation({...newLocation, longitude: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? "Adding..." : "Add Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteLocationId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Delete Location</h3>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to remove this location? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-4 bg-muted/40 border-t border-border">
              <button
                onClick={() => setDeleteLocationId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteLocation}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
