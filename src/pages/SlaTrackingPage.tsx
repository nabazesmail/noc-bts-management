import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SlaTracking } from "../types";
import { Search, Loader2, Activity, HardDrive, Calendar, Clock, ChevronDown, ChevronUp, Plus, Edit2, Trash2, Download } from "lucide-react";
import { isToday, isThisWeek, format, startOfWeek, endOfWeek, parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay, subDays } from "date-fns";
import { Link } from "react-router-dom";
import SlaReportModal from "../components/SlaReportModal";
import ExportDataModal from "../components/ExportDataModal";
import { useToast } from "../components/ToastContext";
import { parseSiteDate, formatDisplayDate } from "../lib/utils";
import { downloadCSV } from "../lib/exportUtils";

export default function SlaTrackingPage() {
  const [data, setData] = useState<SlaTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("All");
  const [nocSlaFilter, setNocSlaFilter] = useState("All");
  const [siteSlaFilter, setSiteSlaFilter] = useState("All");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteSlaId, setDeleteSlaId] = useState<string | null>(null);
  const toast = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const uniqueRegions = ["1", "2", "3", "4", "RC"];
  const allowedMonths = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const allowedStatuses = ["Open", "Follow", "Resolved", "Done", "Closed"];
  const uniqueNocSla = Array.from(new Set(data.map((d) => String(d.noc_sla_status || '').trim()).filter(s => s !== '' && s !== '0' && s !== '-'))).sort();
  const uniqueSiteSla = Array.from(new Set(data.map((d) => String(d.site_sla_status || '').trim()).filter(s => s !== '' && s !== '0' && s !== '-'))).sort();
  const allowedServiceTypes = ["LTE", "RXD_Clients", "Z_LOCATION", "Node.Input.AC.power", "TV_Clients"];

  useEffect(() => {
    fetchSlaData();
  }, []);

  const fetchSlaData = async () => {
    try {
      setLoading(true);
      const { data: slaData, error } = await api.get("/slatracking");
      if (slaData) {
        slaData.sort((a: any, b: any) => {
          const tA = parseSiteDate(a.start_date) || 0;
          const tB = parseSiteDate(b.start_date) || 0;
          return tB - tA;
        });
      }

      if (error) throw error;
      setData(slaData || []);
    } catch (error: any) {
      console.error("Error fetching SLA data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteSlaId) return;
    try {
      const { error } = await api.delete(`/slatracking/${deleteSlaId}`);
      if (error) throw error;
      setData(data.filter((item) => item.id !== deleteSlaId));
      setDeleteSlaId(null);
      toast.success("Record deleted successfully");
    } catch (error: any) {
      toast.error("Error deleting record: " + error.message);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const isSlaMet = (status: any) => {
    const s = String(status || '').toLowerCase();
    return s.includes('met') || s === 'yes';
  };

  const isSlaMissed = (status: any) => {
    const s = String(status || '').toLowerCase();
    return s.includes('missed') || s === 'no';
  };

  const kpis = React.useMemo(() => {
    let nocTodayTotal = 0, nocTodayMet = 0, nocWeekTotal = 0, nocWeekMet = 0;
    let siteTodayTotal = 0, siteTodayMet = 0, siteWeekTotal = 0, siteWeekMet = 0;

    const now = new Date();
    const sevenDaysAgoStart = startOfDay(subDays(now, 6));
    const endOfToday = endOfDay(now);

    data.forEach(item => {
      if (!item.start_date) return;
      const dateMs = parseSiteDate(item.start_date);
      if (!dateMs) return;
      
      const date = new Date(dateMs);
      const today = isToday(date);
      const thisWeek = (isAfter(date, sevenDaysAgoStart) || isEqual(date, sevenDaysAgoStart)) && (isBefore(date, endOfToday) || isEqual(date, endOfToday));

      const nocStatus = String(item.noc_sla_status || item.noc_sla || '');
      if (nocStatus && nocStatus.toLowerCase() !== 'na' && nocStatus.toLowerCase() !== 'n/a' && nocStatus !== '-') {
        if (today) { nocTodayTotal++; if (isSlaMet(nocStatus)) nocTodayMet++; }
        if (thisWeek) { nocWeekTotal++; if (isSlaMet(nocStatus)) nocWeekMet++; }
      }

      const siteStatus = String(item.site_sla_status || item.site_sla || '');
      if (siteStatus && siteStatus.toLowerCase() !== 'na' && siteStatus.toLowerCase() !== 'n/a' && siteStatus !== '-') {
        if (today) { siteTodayTotal++; if (isSlaMet(siteStatus)) siteTodayMet++; }
        if (thisWeek) { siteWeekTotal++; if (isSlaMet(siteStatus)) siteWeekMet++; }
      }
    });

    return {
      nocTodayPercent: nocTodayTotal ? Math.round((nocTodayMet / nocTodayTotal) * 100) : 100,
      nocWeekPercent: nocWeekTotal ? Math.round((nocWeekMet / nocWeekTotal) * 100) : 100,
      siteTodayPercent: siteTodayTotal ? Math.round((siteTodayMet / siteTodayTotal) * 100) : 100,
      siteWeekPercent: siteWeekTotal ? Math.round((siteWeekMet / siteWeekTotal) * 100) : 100,
      nocTodayText: `${nocTodayMet} / ${nocTodayTotal}`,
      nocWeekText: `${nocWeekMet} / ${nocWeekTotal}`,
      siteTodayText: `${siteTodayMet} / ${siteTodayTotal}`,
      siteWeekText: `${siteWeekMet} / ${siteWeekTotal}`,
    };
  }, [data]);

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      const searchMatch = 
        String(item.site_code_dc || '').toLowerCase().includes(search) ||
        String(item.region || '').toLowerCase().includes(search) ||
        String(item.noc_staff || '').toLowerCase().includes(search) ||
        String(item.responsible_department || '').toLowerCase().includes(search);

      const regionMatch = regionFilter === "All" || String(item.region || '') === regionFilter;
      const monthMatch = monthFilter === "All" || String(item.month || '') === monthFilter;
      const statusMatch = statusFilter === "All" || String(item.status || '') === statusFilter;
      const serviceTypeMatch = serviceTypeFilter === "All" || String(item.service_type || '') === serviceTypeFilter;
      const nocMatch = nocSlaFilter === "All" || String(item.noc_sla_status || '') === nocSlaFilter;
      const siteMatch = siteSlaFilter === "All" || String(item.site_sla_status || '') === siteSlaFilter;

      return searchMatch && regionMatch && monthMatch && statusMatch && serviceTypeMatch && nocMatch && siteMatch;
    });
  }, [data, searchTerm, regionFilter, monthFilter, statusFilter, serviceTypeFilter, nocSlaFilter, siteSlaFilter]);

  const paginatedData = React.useMemo(() => {
    return filteredData.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredData, page, pageSize]);

  const handleExportData = (startDate: string, endDate: string) => {
    let recordsToExport = data;

    if (startDate && endDate) {
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));

      recordsToExport = data.filter(row => {
        if (!row.start_date) return false;
        try {
          const rowDateMs = parseSiteDate(row.start_date);
          if (!rowDateMs) return false;
          const rowDate = new Date(rowDateMs);
          return (isAfter(rowDate, start) || isEqual(rowDate, start)) &&
                 (isBefore(rowDate, end) || isEqual(rowDate, end));
        } catch (e) {
          return false;
        }
      });
    }

    downloadCSV(recordsToExport, `Sla_Tracking_Data${startDate && endDate ? `_${startDate}_to_${endDate}` : '_All'}`);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-background text-foreground transition-colors overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" /> SLA Tracking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Daily and Weekly SLA Compliance Reports</p>
        </div>
        
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by site, region, staff..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setReportOpen(true)}
              className="flex items-center gap-2 bg-card border border-border hover:bg-muted text-foreground px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
            >
              <Calendar className="h-4 w-4 text-blue-500" />
              Weekly Report
            </button>
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-2 bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/20 px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <Link
              to="/sla-tracking/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Record</span>
            </Link>
          </div>
        </div>

        <SlaReportModal 
          isOpen={reportOpen} 
          onClose={() => setReportOpen(false)} 
          data={data} 
        />
        
        <ExportDataModal
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          onExport={handleExportData}
          title="Export SLA Tracking Data"
        />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 shrink-0">
        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={regionFilter}
          onChange={(e) => { setRegionFilter(e.target.value); setPage(0); }}
        >
          <option value="All">All Regions</option>
          {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={monthFilter}
          onChange={(e) => { setMonthFilter(e.target.value); setPage(0); }}
        >
          <option value="All">All Months</option>
          {allowedMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="All">All Statuses</option>
          {allowedStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={serviceTypeFilter}
          onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(0); }}
        >
          <option value="All">All Service Types</option>
          {allowedServiceTypes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={nocSlaFilter}
          onChange={(e) => { setNocSlaFilter(e.target.value); setPage(0); }}
        >
          <option value="All">All NOC SLA</option>
          {uniqueNocSla.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={siteSlaFilter}
          onChange={(e) => { setSiteSlaFilter(e.target.value); setPage(0); }}
        >
          <option value="All">All Site SLA</option>
          {uniqueSiteSla.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
        {/* Helper values for dynamic dates */}
        {(() => {
          const now = new Date();
          const todayStr = format(now, 'd MMM');
          const weekStart = format(subDays(now, 6), 'd MMM');
          const weekEnd = format(now, 'd MMM');

          return (
            <>
              <div className="bg-card border-t-4 border-t-blue-500 rounded-lg p-4 shadow-sm border border-border">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase">NOC SLA (TODAY: {todayStr})</h3>
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{kpis.nocTodayPercent}%</span>
                  <span className="text-xs font-semibold text-muted-foreground">MET</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.nocTodayText} Sites Compliant</p>
              </div>
              <div className="bg-card border-t-4 border-t-amber-500 rounded-lg p-4 shadow-sm border border-border">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase">SITE SLA (TODAY: {todayStr})</h3>
                  <HardDrive className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{kpis.siteTodayPercent}%</span>
                  <span className="text-xs font-semibold text-muted-foreground">MET</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.siteTodayText} Sites Compliant</p>
              </div>
              <div className="bg-card border-t-4 border-t-blue-400 rounded-lg p-4 shadow-sm border border-border">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase">NOC SLA (WEEK: {weekStart} - {weekEnd})</h3>
                  <Calendar className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{kpis.nocWeekPercent}%</span>
                  <span className="text-xs font-semibold text-muted-foreground">MET</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.nocWeekText} Sites Compliant</p>
              </div>
              <div className="bg-card border-t-4 border-t-amber-400 rounded-lg p-4 shadow-sm border border-border">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase">SITE SLA (WEEK: {weekStart} - {weekEnd})</h3>
                  <Calendar className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{kpis.siteWeekPercent}%</span>
                  <span className="text-xs font-semibold text-muted-foreground">MET</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{kpis.siteWeekText} Sites Compliant</p>
              </div>
            </>
          );
        })()}
      </div>

      <div className="flex-1 overflow-auto bg-card rounded-lg border border-border shadow-sm relative min-h-0">
        <div className="min-w-max">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 shadow-sm">
              <tr className="border-b border-border">
                <th className="p-3 w-10"></th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Site Code</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">NOC Staff</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Region</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Start Date</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Duration</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Reason</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Dept</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Status</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">NOC SLA (Time / Max)</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Site SLA (Time / Max)</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading SLA Data...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-muted-foreground">
                    No SLA records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const nocStatus = String(item.noc_sla_status || item.noc_sla || '');
                  const siteStatus = String(item.site_sla_status || item.site_sla || '');
                  const rowId = String(item.id);
                  const isExpanded = expandedRows.has(rowId);

                  return (
                    <React.Fragment key={rowId}>
                      <tr className={`hover:bg-muted/50 transition-colors group ${isExpanded ? 'bg-muted/30' : ''}`}>
                        <td className="p-3">
                          <button onClick={() => toggleRow(rowId)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-3 text-sm font-bold text-foreground whitespace-nowrap">{item.site_code_dc || "-"}</td>
                        <td className="p-3 text-sm text-foreground whitespace-nowrap">{item.noc_staff || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.region || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{formatDisplayDate(item.start_date)} {item.start_time}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.duration_time || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[150px] truncate" title={item.reason}>{item.reason || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.responsible_department || "-"}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            String(item.status || '').toLowerCase() === 'closed' || String(item.status || '').toLowerCase() === 'resolved' || String(item.status || '').toLowerCase() === 'done'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {item.status || "Open"}
                          </span>
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              isSlaMet(nocStatus)
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : isSlaMissed(nocStatus)
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {nocStatus || "NA"}
                            </span>
                            {item.noc_sla && item.noc_sla !== "NA" && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.noc_mtta !== "" && item.noc_mtta != null ? item.noc_mtta : "-"} / {item.noc_sla !== "" && item.noc_sla != null ? item.noc_sla : "-"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              isSlaMet(siteStatus)
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : isSlaMissed(siteStatus)
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {siteStatus || "NA"}
                            </span>
                            {item.site_sla && item.site_sla !== "NA" && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {item.site_mttr !== "" && item.site_mttr != null ? item.site_mttr : "-"} / {item.site_sla !== "" && item.site_sla != null ? item.site_sla : "-"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/sla-tracking/${rowId}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Edit SLA"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteSlaId(rowId)}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete SLA"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/30 border-b border-border">
                          <td colSpan={12} className="p-0">
                            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                              
                              <div className="space-y-4">
                                <h4 className="font-semibold text-blue-500 mb-2 border-b border-border pb-1">Site Details</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">City:</span>
                                  <span className="font-medium text-foreground">{item.city || "-"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">Service Type:</span>
                                  <span className="font-medium text-foreground">{item.service_type || "-"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">Band Type:</span>
                                  <span className="font-medium text-foreground">{item.band_type || "-"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">Band:</span>
                                  <span className="font-medium text-foreground">{item.band || "-"}</span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h4 className="font-semibold text-blue-500 mb-2 border-b border-border pb-1">Time & Shift Details</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">Shift:</span>
                                  <span className="font-medium text-foreground">{item.shift || "-"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">End Date:</span>
                                  <span className="font-medium text-foreground">{item.end_date || "-"} {item.end_time}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">Duration (Hrs):</span>
                                  <span className="font-medium text-foreground">{item.duration_hours || "-"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <span className="text-muted-foreground">Duration (Mins):</span>
                                  <span className="font-medium text-foreground">{item.duration_minutes || "-"}</span>
                                </div>
                              </div>

                              <div className="space-y-4 lg:col-span-2">
                                <h4 className="font-semibold text-blue-500 mb-2 border-b border-border pb-1">Technical Notes</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                  <span className="text-muted-foreground">Issue Area:</span>
                                  <span className="font-medium text-foreground md:col-span-3">{item.issue_technical_area || "-"}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                  <span className="text-muted-foreground">Peak/Off-Peak:</span>
                                  <span className="font-medium text-foreground md:col-span-3">{item.peak_none_peak || "-"}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                  <span className="text-muted-foreground">Comment:</span>
                                  <span className="font-medium text-foreground md:col-span-3 bg-background p-2 rounded border border-border">{item.comment || "-"}</span>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredData.length > 0 && (
          <div className="flex justify-between items-center p-4 border-t border-border sticky bottom-0 bg-card z-10">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {Math.ceil(filteredData.length / pageSize) || 1}
            </span>
            <button
              disabled={(page + 1) * pageSize >= filteredData.length}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
        {deleteSlaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete SLA Record?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to permanently delete this SLA record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteSlaId(null)}
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
    </div>
  </div>
);
}


