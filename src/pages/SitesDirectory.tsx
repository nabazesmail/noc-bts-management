import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Profile, Site } from "@/types";
import { useToast } from "@/components/ToastContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function SitesDirectory({}: { profile: Profile | null }) {
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [bandFilter, setBandFilter] = useState("All");
  const [powerFilter, setPowerFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availablePowerSources, setAvailablePowerSources] = useState<string[]>([]);
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);
  const [toggleSiteTarget, setToggleSiteTarget] = useState<Site | null>(null);
  const toast = useToast();
  const pageSize = 50;

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    const { data } = await supabase.from("sites").select("*");
    if (data) {
      const sortedData = data.sort((a: any, b: any) => {
        const numA = parseInt(a.site_no, 10) || 0;
        const numB = parseInt(b.site_no, 10) || 0;
        return numA - numB;
      });
      
      setAllSites(sortedData);
      
      const uniqueRegions = Array.from(new Set(sortedData.map((d: any) => d.region).filter(Boolean))).sort();
      setAvailableRegions(uniqueRegions as string[]);
      
      const uniquePower = Array.from(new Set(sortedData.map((d: any) => d.power_source).filter(Boolean))).sort();
      setAvailablePowerSources(uniquePower as string[]);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteSiteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteSiteId) return;
    const { error } = await supabase.from("sites").delete().eq("id", deleteSiteId);
    if (error) {
      toast.error("Failed to delete site");
    } else {
      toast.success("Site deleted successfully");
      setDeleteSiteId(null);
      fetchSites();
    }
  };

  const getSiteStatus = (site: Site) => {
    const comm = site.comments?.toLowerCase() || '';
    const enb20 = site.enodb_20?.toLowerCase() || '';
    const enb7 = site.enodb_7?.toLowerCase() || '';

    if (comm.includes('dismantled')) return "Dismantled";
    if (comm.includes('out of service') || enb20.includes('out of service') || enb7.includes('out of service')) return "Out of Service";
    if (comm.includes('turned off') || comm.includes('off air') || comm.includes('stolen')) return "Off-Air";
      
    return "On-Air";
  };

  const confirmToggleStatus = async () => {
    if (!toggleSiteTarget) return;
    const site = toggleSiteTarget;
    const currentStatus = getSiteStatus(site);
    
    let newComment = site.comments || '';

    if (currentStatus === "On-Air") {
      newComment = `[Off Air] ${newComment}`.trim();
    } else {
      newComment = newComment
        .replace(/\[?off air\]?/gi, '')
        .replace(/\[?turned off\]?/gi, '')
        .replace(/\[?stolen\]?/gi, '')
        .replace(/out of service/gi, '')
        .replace(/dismantled/gi, '')
        .trim();
    }

    try {
      const { error } = await supabase
        .from('sites')
        .update({ comments: newComment })
        .eq('id', site.id);
      
      if (error) throw error;
      toast.success("Site status updated successfully.");
      setAllSites(prev => prev.map(s => s.id === site.id ? { ...s, comments: newComment } : s));
      setToggleSiteTarget(null);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const getBandType = (site: Site) => {
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

  const toggleRow = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const filteredSites = allSites.filter((site) => {
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

    const matchesPower = powerFilter === "All" || (site.power_source === powerFilter);
                          
    let matchesDate = true;
    if (yearFilter !== "All" || monthFilter !== "All") {
      const b20Time = parseSiteDate(site.b20_on_air_date);
      const b7Time = parseSiteDate(site.b7_on_air_date);
      
      const checkTime = (t: number | null) => {
        if (!t) return false;
        const d = new Date(t);
        const yMatch = yearFilter === "All" || d.getFullYear().toString() === yearFilter;
        const mMatch = monthFilter === "All" || d.getMonth().toString() === monthFilter;
        return yMatch && mMatch;
      };

      matchesDate = checkTime(b20Time) || checkTime(b7Time);
    }

    return matchesSearch && matchesRegion && matchesStatus && matchesBand && matchesPower && matchesDate;
  });
  
  const yearsSet = new Set<number>();
  allSites.forEach(site => {
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

  const paginatedSites = filteredSites.slice(page * pageSize, (page + 1) * pageSize);

  return (
  <>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Site Data</h2>
        <Link 
          to="/sites/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Site</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by Site No, Name, IP, Date..."
            className="pl-9 dark:bg-gray-900 dark:border-gray-800"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        
        <div className="w-full sm:w-36">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(0); }}
          >
            <option value="All">All Regions</option>
            <option value="Road Coverage">Road Coverage</option>
            {availableRegions.map(region => (
              <option key={region} value={region}>
                {region.toString().length === 1 ? `Region ${region}` : region}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-36">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="All">All Status</option>
            <option value="On-Air">On-Air (Working)</option>
            <option value="Off-Air">Off-Air (Not Working)</option>
            <option value="Out of Service">Out of Service</option>
            <option value="Dismantled">Dismantled</option>
          </select>
        </div>

        <div className="w-full sm:w-44">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={bandFilter}
            onChange={(e) => { setBandFilter(e.target.value); setPage(0); }}
          >
            <option value="All">All Bands</option>
            <option value="Dual-Band">Dual-Band</option>
            <option value="Combined">Combined</option>
            <option value="Single-Band (Any)">Single-Band (Any)</option>
            <option value="Single-Band (B20)">Single-Band (B20)</option>
            <option value="Single-Band (B7)">Single-Band (B7)</option>
          </select>
        </div>

        <div className="w-full sm:w-44">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={powerFilter}
            onChange={(e) => { setPowerFilter(e.target.value); setPage(0); }}
          >
            <option value="All">All Power Sources</option>
            {availablePowerSources.map(power => (
              <option key={power} value={power}>{power}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-1 w-full sm:w-auto">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">On-Air:</span>
          <select
            className="flex h-8 w-24 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(0); }}
          >
            <option value="All">Year</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <select
            className="flex h-8 w-32 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={monthFilter}
            onChange={(e) => { setMonthFilter(e.target.value); setPage(0); }}
            disabled={yearFilter === "All"}
          >
            <option value="All">Month</option>
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="p-4 font-medium w-10"></th>
              <th className="p-4 font-medium">Site No</th>
              <th className="p-4 font-medium">Site Code</th>
              <th className="p-4 font-medium">Site Name</th>
              <th className="p-4 font-medium">Region</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Band Type</th>
              <th className="p-4 font-medium">Power Source</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedSites.map((site) => {
              const isExpanded = expandedRows.includes(site.id);
              const siteStatus = getSiteStatus(site);
              const bandType = getBandType(site);
              return (
                <React.Fragment key={site.id}>
                  <tr className="hover:bg-muted/50 transition-colors group">
                    <td className="p-4">
                      <button
                        onClick={() => toggleRow(site.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{site.site_no}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-mono text-xs">{site.site_code}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{site.site_name}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{site.region}</td>
                    <td className="p-4">
                      <Badge
                        onClick={() => setToggleSiteTarget(site)}
                        variant={siteStatus === "On-Air" ? "default" : "destructive"}
                        className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 ${siteStatus === "On-Air" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                        title="Click to toggle status"
                      >
                        {siteStatus}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {bandType !== "-" && (
                        <Badge variant="outline" className={bandType === "Dual-Band" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800" : "text-gray-600 border-gray-200 bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700"}>
                          {bandType}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{site.power_source || "-"}</td>
                    <td className="p-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/sites/${site.id}`}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit Site"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete Site"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Row Content (Band Data) */}
                  {isExpanded && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-0">
                      <td colSpan={9} className="p-0">
                        <div className="p-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                          {/* Band 20 Summary */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-blue-600 dark:text-blue-400 border-b dark:border-gray-700 pb-1">Band 20 Data</h4>
                            <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                              <span className="font-medium text-gray-900 dark:text-gray-300">ENODB:</span>
                              <span>{site.enodb_20 || '-'}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-300">IP Address:</span>
                              <span className="font-mono text-xs">{site.band_20_ip || '-'}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-300">On Air Date:</span>
                              <span>{site.b20_on_air_date || '-'}</span>
                            </div>
                          </div>
                          {/* Band 7 Summary */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-green-600 dark:text-green-400 border-b dark:border-gray-700 pb-1">Band 7 Data</h4>
                            <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                              <span className="font-medium text-gray-900 dark:text-gray-300">ENODB:</span>
                              <span>{site.enodb_7 || '-'}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-300">IP Address:</span>
                              <span className="font-mono text-xs">{site.band_7_ip || '-'}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-300">On Air Date:</span>
                              <span>{site.b7_on_air_date || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {paginatedSites.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No sites found matching your search.
          </div>
        )}
      </div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page + 1} of {Math.ceil(filteredSites.length / pageSize) || 1}</span>
          <Button
            variant="outline"
            disabled={(page + 1) * pageSize >= filteredSites.length}
            onClick={() => setPage((p) => p + 1)}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            Next
          </Button>
        </div>

      {deleteSiteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete Site?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to permanently delete this site? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteSiteId(null)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors text-foreground"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toggleSiteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Change Site Status?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to mark this site as {getSiteStatus(toggleSiteTarget) === "On-Air" ? "Off-Air" : "On-Air"}?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setToggleSiteTarget(null)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors text-foreground"
              >
                Cancel
              </button>
              <button 
                onClick={confirmToggleStatus}
                className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors ${getSiteStatus(toggleSiteTarget) === "On-Air" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                Confirm {getSiteStatus(toggleSiteTarget) === "On-Air" ? "Off-Air" : "On-Air"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}




