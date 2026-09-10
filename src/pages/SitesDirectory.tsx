import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Profile, Site } from "@/types";
import { useToast } from "@/components/ToastContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Download, RadioTower } from "lucide-react";
import { parseSiteDate, formatDisplayDate } from "@/lib/utils";
import ExportDataModal from "../components/ExportDataModal";
import { downloadCSV } from "../lib/exportUtils";
import { parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';

export default function SitesDirectory({}: { profile: Profile | null }) {
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [b20StatusFilter, setB20StatusFilter] = useState("All");
  const [b7StatusFilter, setB7StatusFilter] = useState("All");
  const [bandFilter, setBandFilter] = useState("All");
  const [powerFilter, setPowerFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [page, setPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availablePowerSources, setAvailablePowerSources] = useState<string[]>([]);
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toggleSiteTarget, setToggleSiteTarget] = useState<{ site: Site, band: 'B20' | 'B7' } | null>(null);
  const toast = useToast();
  const pageSize = 50;

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    const { data, error } = await api.get("/sites");
    if (error) {
      console.error("Failed to fetch sites", error);
      return;
    }
    if (data) {
      const sortedData = data.sort((a: any, b: any) => {
        const numA = parseInt(a.site_no, 10) || 0;
        const numB = parseInt(b.site_no, 10) || 0;
        return numB - numA;
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
    const { error } = await api.delete(`/sites/${deleteSiteId}`);
    if (error) {
      toast.error("Failed to delete site");
    } else {
      toast.success("Site deleted successfully");
      setDeleteSiteId(null);
      fetchSites();
    }
  };

  const getBandStatus = (site: Site, band: 'B20' | 'B7') => {
    const enb = (band === 'B20' ? site.enodb_20 : site.enodb_7)?.toLowerCase() || '';
    const ip = (band === 'B20' ? site.band_20_ip : site.band_7_ip)?.toLowerCase() || '';
    const date = (band === 'B20' ? site.b20_on_air_date : site.b7_on_air_date)?.toLowerCase() || '';
    const comm = site.comments?.toLowerCase() || '';

    const exists = !!(enb && enb !== '-') || !!(ip && ip !== '-') || !!(date && date !== '-');
    if (!exists) return null;

    if (comm.includes('dismantled')) return "Off-Air (Dismantled)";
    if (comm.includes('out of service') || enb.includes('out of service')) return "Off-Air (Out of Service)";
    if (enb.includes('not on air') || enb.includes('off air') || comm.includes('turned off') || comm.includes('off air') || comm.includes('stolen')) return "Off-Air";

    return "On-Air";
  };

  const getSiteStatus = (site: Site) => {
    const b20 = getBandStatus(site, 'B20');
    const b7 = getBandStatus(site, 'B7');
    if (b20 === "On-Air" || b7 === "On-Air") return "On-Air";
    if (b20) return b20;
    if (b7) return b7;
    return "Off-Air";
  };

  const confirmToggleStatus = async () => {
    if (!toggleSiteTarget) return;
    const { site, band } = toggleSiteTarget;
    const currentStatus = getBandStatus(site, band);
    const enbKey = band === 'B20' ? 'enodb_20' : 'enodb_7';
    let currentEnb = site[enbKey as keyof Site] as string || '';
    let newEnb = currentEnb;

    if (currentStatus === "On-Air") {
      newEnb = `[Off Air] ${currentEnb}`.trim();
    } else {
      newEnb = currentEnb
        .replace(/\[?off air\]?/gi, '')
        .replace(/\[?turned off\]?/gi, '')
        .trim();

      const testEnb = newEnb.toLowerCase();
      const ip = (band === 'B20' ? site.band_20_ip : site.band_7_ip)?.toLowerCase() || '';
      const date = (band === 'B20' ? site.b20_on_air_date : site.b7_on_air_date)?.toLowerCase() || '';
      const comm = site.comments?.toLowerCase() || '';
      
      const exists = !!(newEnb && newEnb !== '-') || !!(ip && ip !== '-') || !!(date && date !== '-');
      
      if (!exists) {
        toast.error(`Cannot turn On-Air: ${band} has no data.`);
        setToggleSiteTarget(null);
        return;
      }
      if (testEnb.includes('out of service') || testEnb.includes('not on air')) {
        toast.error(`Cannot turn On-Air: ${band} base status is Out of Service or Not On-Air.`);
        setToggleSiteTarget(null);
        return;
      }
      if (comm.includes('dismantled')) {
        toast.error(`Cannot turn On-Air: Site is dismantled.`);
        setToggleSiteTarget(null);
        return;
      }
      if (comm.includes('off air') || comm.includes('turned off') || comm.includes('stolen')) {
        toast.error(`Cannot turn On-Air: Site comments globally mark it as Off-Air.`);
        setToggleSiteTarget(null);
        return;
      }
    }

    try {
      const { error } = await api.put(`/sites/${site.id}`, { [enbKey]: newEnb });
      
      if (error) throw error;
      toast.success(`${band} status updated successfully.`);
      setAllSites(prev => prev.map(s => s.id === site.id ? { ...s, [enbKey]: newEnb } : s));
      setToggleSiteTarget(null);
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const getBandType = (site: Site) => {
    const hasB20 = !!getBandStatus(site, 'B20');
    const hasB7 = !!getBandStatus(site, 'B7');
    
    if (hasB20 && hasB7) return "Dual-Band";
    if (hasB20) return "Single-Band (B20)";
    if (hasB7) return "Single-Band (B7)";
    return "-";
  };

  const checkIfCombined = (site: Site) => {
    const val = site.combined_both_bands?.toLowerCase().trim();
    return val === 'yes' || val === 'true' || val === '1' || val === 'combined';
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
    const isCombined = bandType === "Dual-Band" && checkIfCombined(site);
    
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

  const handleExportData = (startDate: string, endDate: string) => {
    let recordsToExport = allSites;

    if (startDate && endDate) {
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));

      recordsToExport = allSites.filter(site => {
        const checkTime = (dateStr: string | null | undefined) => {
          if (!dateStr) return false;
          try {
            const ms = parseSiteDate(dateStr);
            if (!ms) return false;
            const d = new Date(ms);
            return (isAfter(d, start) || isEqual(d, start)) &&
                   (isBefore(d, end) || isEqual(d, end));
          } catch {
            return false;
          }
        };

        return checkTime(site.b20_on_air_date) || checkTime(site.b7_on_air_date);
      });
    }

    // Flatten any nested structures if necessary or just export directly
    const flattenedData = recordsToExport.map(site => {
      // Create a clean object for CSV
      const cleanSite: any = { ...site };
      // Convert nested Location into distinct fields for CSV 
      if (cleanSite.SiteLocation) {
        cleanSite.longitude = cleanSite.SiteLocation.longitude;
        cleanSite.latitude = cleanSite.SiteLocation.latitude;
        delete cleanSite.SiteLocation;
      }
      return cleanSite;
    });

    downloadCSV(flattenedData, `Sites_Directory${startDate && endDate ? `_${startDate}_to_${endDate}` : '_All'}`);
  };

  const paginatedSites = filteredSites.slice(page * pageSize, (page + 1) * pageSize);

  return (
  <>
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <RadioTower className="w-10 h-10 text-white drop-shadow-md" />
          <h2 className="text-3xl font-bold tracking-tight text-white dark:text-white uppercase">SITE DATA</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/20 px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <Link 
            to="/sites/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Site</span>
          </Link>
        </div>
      </div>

      <ExportDataModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExportData}
        title="Export Site Directory Data"
      />

      <div className="flex flex-row items-center gap-3 overflow-x-auto pb-2 styled-scrollbar w-full">
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by Site No, Name, IP, Date..."
            className="pl-9 dark:bg-gray-900 dark:border-gray-800"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        
        <div className="w-32 shrink-0">
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

        <div className="w-36 shrink-0">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={b20StatusFilter}
            onChange={(e) => { setB20StatusFilter(e.target.value); setPage(0); }}
          >
            <option value="All">B20 Status</option>
            <option value="On-Air">On-Air (Working)</option>
            <option value="Off-Air">Off-Air (Any Reason)</option>
            <option value="Off-Air (Dismantled)">Off-Air (Dismantled)</option>
            <option value="Off-Air (Out of Service)">Off-Air (Out of Service)</option>
          </select>
        </div>

        <div className="w-36 shrink-0">
          <select
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:border-gray-800"
            value={b7StatusFilter}
            onChange={(e) => { setB7StatusFilter(e.target.value); setPage(0); }}
          >
            <option value="All">B7 Status</option>
            <option value="On-Air">On-Air (Working)</option>
            <option value="Off-Air">Off-Air (Any Reason)</option>
            <option value="Off-Air (Dismantled)">Off-Air (Dismantled)</option>
            <option value="Off-Air (Out of Service)">Off-Air (Out of Service)</option>
          </select>
        </div>

        <div className="w-36 shrink-0">
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

        <div className="w-40 shrink-0">
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

        <div className="flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-1 shrink-0">
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

      <div className="rounded-md border border-border bg-card overflow-x-auto shadow-sm styled-scrollbar">
        <table className="w-full text-sm text-left min-w-[1000px]">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground">
            <tr>
              <th className="p-4 font-medium w-10"></th>
              <th className="p-4 font-medium whitespace-nowrap">Site No</th>
              <th className="p-4 font-medium whitespace-nowrap">Site Code</th>
              <th className="p-4 font-medium whitespace-nowrap">Site Name</th>
              <th className="p-4 font-medium whitespace-nowrap">Region</th>
              <th className="p-4 font-medium whitespace-nowrap">Status</th>
              <th className="p-4 font-medium whitespace-nowrap">Band Type</th>
              <th className="p-4 font-medium whitespace-nowrap">Power Source</th>
              <th className="p-4 font-medium text-right whitespace-nowrap">Actions</th>
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
                      <div className="flex flex-col gap-1 items-start">
                        {getBandStatus(site, 'B20') && (
                          <Badge
                            onClick={() => setToggleSiteTarget({ site, band: 'B20' })}
                            variant={getBandStatus(site, 'B20') === "On-Air" ? "default" : "destructive"}
                            className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 ${getBandStatus(site, 'B20') === "On-Air" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                            title="Toggle B20 Status"
                          >
                            B20: {getBandStatus(site, 'B20')}
                          </Badge>
                        )}
                        {getBandStatus(site, 'B7') && (
                          <Badge
                            onClick={() => setToggleSiteTarget({ site, band: 'B7' })}
                            variant={getBandStatus(site, 'B7') === "On-Air" ? "default" : "destructive"}
                            className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 ${getBandStatus(site, 'B7') === "On-Air" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                            title="Toggle B7 Status"
                          >
                            B7: {getBandStatus(site, 'B7')}
                          </Badge>
                        )}
                        {!getBandStatus(site, 'B20') && !getBandStatus(site, 'B7') && (
                          <Badge variant="outline" className="text-gray-500">
                            Unknown
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {bandType !== "-" && (
                        <div className="flex gap-2 items-center flex-wrap">
                          <Badge variant="outline" className={`whitespace-nowrap ${bandType === "Dual-Band" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800" : "text-gray-600 border-gray-200 bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700"}`}>
                            {bandType}
                          </Badge>
                          {bandType === "Dual-Band" && checkIfCombined(site) && (
                            <Badge variant="outline" className="whitespace-nowrap text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
                              Combined
                            </Badge>
                          )}
                        </div>
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
                              <span>{formatDisplayDate(site.b20_on_air_date)}</span>
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
                              <span>{formatDisplayDate(site.b7_on_air_date)}</span>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Change {toggleSiteTarget.band} Status?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to mark {toggleSiteTarget.band} as {getBandStatus(toggleSiteTarget.site, toggleSiteTarget.band) === "On-Air" ? "Off-Air" : "On-Air"}?
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
                className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors ${getBandStatus(toggleSiteTarget.site, toggleSiteTarget.band) === "On-Air" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                Confirm {getBandStatus(toggleSiteTarget.site, toggleSiteTarget.band) === "On-Air" ? "Off-Air" : "On-Air"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}




