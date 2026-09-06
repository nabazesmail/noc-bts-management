import { useEffect, useState } from "react";
import { Profile } from "@/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Map from "@/components/Map";

export default function SiteLocations({
  profile,
}: {
  profile: Profile | null;
}) {
  const [sites, setSites] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bandFilter, setBandFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketVisibility, setTicketVisibility] = useState("open"); // hidden, open, closed, all
  const [loading, setLoading] = useState(true);

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
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("*");

      if (sitesError) throw sitesError;

      // 2. Fetch all locations separately (bypassing the relation error)
      const { data: locationsData, error: locationsError } = await supabase
        .from("site_locations")
        .select("*");

      if (locationsError) {
        console.warn(
          "Could not fetch site_locations. Check table name.",
          locationsError.message,
        );
      }

      // 3. Manually merge the coordinates into the sites array
      if (sitesData) {
        const sitesWithCoords = sitesData
          .map((site: any) => {
            // Find matching location by site_code or site_id
            const loc = locationsData?.find(
              (l: any) =>
                l.site_code === site.site_code || l.site_id === site.id,
            );

            return {
              ...site,
              // Extract coordinates safely
              latitude: loc?.latitude || loc?.lat || site.latitude || site.lat,
              longitude:
                loc?.longitude || loc?.long || site.longitude || site.long,
            };
          })
          .filter((site: any) => {
            const lat = Number(site.latitude);
            const lng = Number(site.longitude);
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
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("*");

      if (ticketsError) {
        console.warn("Could not fetch tickets.", ticketsError.message);
      } else if (ticketsData) {
        setTickets(ticketsData);
      }

    } catch (error: any) {
      console.error("Error fetching map data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSiteStatus = (site: any) => {
    const comm = site.comments?.toLowerCase() || '';
    const enb20 = site.enodb_20?.toLowerCase() || '';
    const enb7 = site.enodb_7?.toLowerCase() || '';

    if (comm.includes('dismantled')) return "Dismantled";
    if (comm.includes('out of service') || enb20.includes('out of service') || enb7.includes('out of service')) return "Out of Service";
    if (comm.includes('turned off') || comm.includes('off air') || comm.includes('stolen')) return "Off-Air";
      
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
    
    const siteStatus = getSiteStatus(site);
    const matchesStatus = statusFilter === "All" || 
                          (statusFilter === "Off-Air" && siteStatus !== "On-Air") || 
                          siteStatus === statusFilter;

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
        <h2 className="text-3xl font-bold tracking-tight">Site Locations</h2>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by IP, Date, Name..."
              className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="flex h-10 w-full sm:w-36 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
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
            className="flex h-10 w-full sm:w-36 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="On-Air">On-Air (Working)</option>
            <option value="Off-Air">Off-Air (Not Working)</option>
            <option value="Out of Service">Out of Service</option>
            <option value="Dismantled">Dismantled</option>
          </select>

          <select
            className="flex h-10 w-full sm:w-44 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
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

          <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-1 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-500 whitespace-nowrap">On-Air:</span>
            <select
              className="flex h-8 w-24 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="All">Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <select
              className="flex h-8 w-32 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              disabled={yearFilter === "All"}
            >
              <option value="All">Month</option>
              {months.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          <select
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:bg-gray-900 dark:border-gray-800"
            value={ticketVisibility}
            onChange={(e) => setTicketVisibility(e.target.value)}
          >
            <option value="hidden">Hide Tickets</option>
            <option value="open">Show Open Tickets</option>
            <option value="closed">Show Closed Tickets</option>
            <option value="all">Show All Tickets</option>
          </select>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm relative">
        <Map sites={mapData} loading={loading} forceCenter={forceCenter} forceZoom={forceZoom} />
      </div>
    </div>
  );
}
