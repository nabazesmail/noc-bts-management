import React, { useEffect, useState } from 'react';
import { Search, Loader2, Scissors, Calendar, ChevronDown, ChevronUp, MapPin, Clock, AlertTriangle, Activity, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import FiberCutReportModal from '../components/FiberCutReportModal';

export default function FiberCutsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Basic filters
  const [regionFilter, setRegionFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiberCuts();
  }, []);

  const fetchFiberCuts = async () => {
    try {
      setLoading(true);
      const { data: fiberCuts, error } = await supabase
        .from('fiber_cuts')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setData(fiberCuts || []);
    } catch (error: any) {
      console.error('Error fetching fiber cuts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRecordId) return;
    try {
      const { error } = await supabase.from('fiber_cuts').delete().eq('id', deleteRecordId);
      if (error) throw error;
      setData(data.filter(item => item.id !== deleteRecordId));
      setDeleteRecordId(null);
    } catch (error: any) {
      alert("Failed to delete record: " + error.message);
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

  const uniqueRegions = Array.from(new Set(data.map(item => item.region_cut_type).filter(Boolean))).sort();
  const uniqueYears = Array.from(new Set(data.map(item => {
    if (!item.start_date) return null;
    try {
      const d = new Date(item.start_date);
      return isNaN(d.getFullYear()) ? null : String(d.getFullYear());
    } catch { return null; }
  }).filter(Boolean))).sort().reverse();
  const uniqueMonths = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const uniqueTypes = Array.from(new Set(data.map(item => item.cut_type).filter(Boolean))).sort();

  const filteredData = data.filter(row => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      String(row.cut_location || '').toLowerCase().includes(search) ||
      String(row.reason || '').toLowerCase().includes(search) ||
      String(row.supervisors_name || '').toLowerCase().includes(search);
      
    const matchesRegion = regionFilter === 'All' || row.region_cut_type === regionFilter;
    const matchesMonth = monthFilter === 'All' || String(row.month || '').toUpperCase().startsWith(monthFilter);
    const matchesType = typeFilter === 'All' || row.cut_type === typeFilter;
    
    let matchesYear = true;
    if (yearFilter !== 'All') {
      try {
        const d = new Date(row.start_date);
        if (!isNaN(d.getFullYear())) {
          matchesYear = String(d.getFullYear()) === yearFilter;
        } else {
          matchesYear = false;
        }
      } catch {
        matchesYear = false;
      }
    }

    return matchesSearch && matchesRegion && matchesYear && matchesMonth && matchesType;
  });

  // KPIs
  const totalCuts = filteredData.length;
  const backboneCuts = filteredData.filter(d => String(d.cut_type).toLowerCase().includes('backbone')).length;
  const backhaulCuts = filteredData.filter(d => String(d.cut_type).toLowerCase().includes('backhaul')).length;
  const highImpact = filteredData.filter(d => String(d.noc_cut_evaluation).toLowerCase() === 'high').length;

  return (
    <div className="p-6 h-full flex flex-col bg-background text-foreground transition-colors overflow-hidden">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scissors className="h-6 w-6 text-orange-500" /> Fiber Cuts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Fiber Cut Tracking and Analysis</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search location, reason, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 bg-card border border-border hover:bg-muted text-foreground px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <Calendar className="h-4 w-4 text-orange-500" />
            Monthly Report
          </button>
          <Link
            to="/fiber-cuts/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Record</span>
          </Link>
        </div>
      </div>

      <FiberCutReportModal 
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        data={data}
      />

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 shrink-0">
        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
        >
          <option value="All">All Regions</option>
          {uniqueRegions.map((r: any) => <option key={r} value={r}>{r}</option>)}
        </select>
        
        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="All">All Years</option>
          {uniqueYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="All">All Months</option>
          {uniqueMonths.map((m: any) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">All Cut Types</option>
          {uniqueTypes.map((t: any) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-card border-t-4 border-t-blue-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Total Cuts</h3>
            <Activity className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{totalCuts}</span>
          </div>
        </div>
        <div className="bg-card border-t-4 border-t-orange-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Backbone Cuts</h3>
            <Scissors className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{backboneCuts}</span>
          </div>
        </div>
        <div className="bg-card border-t-4 border-t-amber-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Backhaul Cuts</h3>
            <Scissors className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{backhaulCuts}</span>
          </div>
        </div>
        <div className="bg-card border-t-4 border-t-red-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">High Impact</h3>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{highImpact}</span>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto bg-card rounded-lg border border-border shadow-sm relative min-h-0">
        <div className="min-w-max">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 shadow-sm">
              <tr className="border-b border-border">
                <th className="p-3 w-10"></th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Location</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Region</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Type</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Start Date</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Duration</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Reason</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Evaluation</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading Fiber Cuts Data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No fiber cut records found.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const rowId = item.id || String(index);
                  const isExpanded = expandedRows.has(rowId);

                  return (
                    <React.Fragment key={rowId}>
                      <tr className={`hover:bg-muted/50 transition-colors group ${isExpanded ? 'bg-muted/30' : ''}`}>
                        <td className="p-3">
                          <button onClick={() => toggleRow(rowId)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-3 text-sm font-bold text-foreground whitespace-nowrap">{item.cut_location || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.region_cut_type || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.cut_type || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.start_date || "-"} {item.start_time}</td>
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{item.duration || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate" title={item.reason}>{item.reason || "-"}</td>
                        <td className="p-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            String(item.noc_cut_evaluation || '').toLowerCase() === 'high'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : String(item.noc_cut_evaluation || '').toLowerCase() === 'medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {item.noc_cut_evaluation || "Low"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/fiber-cuts/${rowId}`}
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Edit Record"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => setDeleteRecordId(rowId)}
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete Record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={9} className="p-0">
                            <div className="px-12 py-6 grid grid-cols-1 md:grid-cols-3 gap-8 border-l-4 border-l-orange-500">
                              
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b border-border pb-2">Location & Team Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Coordinates:</span>
                                    <span className="font-medium text-foreground">{item.lat_coordinates || '-'}, {item.log_coordinates || '-'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Source City:</span>
                                    <span className="font-medium text-foreground">{item.dispatched_team_source_city || '-'} ({item.distance_km || '-'})</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Supervisor:</span>
                                    <span className="font-medium text-foreground">{item.supervisors_name || '-'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Excavator:</span>
                                    <span className="font-medium text-foreground">{item.excavator_machine || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b border-border pb-2">Time Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Dispatched:</span>
                                    <span className="font-medium text-foreground">{item.dispatched_time || '-'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Arrival:</span>
                                    <span className="font-medium text-foreground">{item.arival_time || '-'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Splicing:</span>
                                    <span className="font-medium text-foreground">{item.splicing_time || '-'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">End Time:</span>
                                    <span className="font-medium text-foreground">{item.end_date || '-'} {item.end_time || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider border-b border-border pb-2">Impact & Notes</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Impacted LTE:</span>
                                    <span className="font-medium text-foreground col-span-2">{item.impacted_lte_no || '0'} Nodes</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Temp Impacted:</span>
                                    <span className="font-medium text-foreground col-span-2">{item.temporary_impacted_lte_no || '0'} Nodes</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">SLA Status:</span>
                                    <span className="font-medium text-foreground col-span-2">
                                      {item.noc_sla_status ? (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                          String(item.noc_sla_status).toLowerCase() === 'yes' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                          NOC SLA: {item.noc_sla_status}
                                        </span>
                                      ) : '-'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 mt-2">
                                    <span className="text-muted-foreground">Comment:</span>
                                    <div className="bg-background p-2 rounded border border-border text-xs">
                                      {item.comment || 'No comments available.'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete Fiber Cut Record?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to permanently delete this fiber cut record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteRecordId(null)}
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
  );
}
