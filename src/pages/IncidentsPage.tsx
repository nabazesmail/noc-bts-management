import React, { useEffect, useState } from 'react';
import { Search, Loader2, Calendar, ChevronDown, ChevronUp, AlertTriangle, Activity, Trash2, Edit2, Plus, Flame, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import IncidentReportModal from '../components/IncidentReportModal';

export default function IncidentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Basic filters
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [approvalFilter, setApprovalFilter] = useState('All');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const { data: incidents, error } = await supabase
        .from('incidents')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setData(incidents || []);
    } catch (error: any) {
      console.error('Error fetching incidents:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRecordId) return;
    try {
      const { error } = await supabase.from('incidents').delete().eq('id', deleteRecordId);
      if (error) throw error;
      setData(data.filter(item => item.id !== deleteRecordId));
      setDeleteRecordId(null);
      toast.success("Incident deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete record: " + error.message);
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

  const uniqueYears = Array.from(new Set(data.map(item => {
    if (!item.start_date) return null;
    try {
      return new Date(item.start_date).getFullYear().toString();
    } catch {
      return null;
    }
  }).filter(Boolean))).sort((a, b) => Number(b) - Number(a));

  const uniqueMonths = Array.from(new Set(data.map(item => String(item.month || '').toUpperCase()).filter(Boolean))).sort();
  const uniqueDepts = Array.from(new Set(data.map(item => item.responsible_department).filter(Boolean))).sort();
  const uniqueApprovals = Array.from(new Set(data.map(item => item.maintenance_approval).filter(Boolean))).sort();

  const filteredData = data.filter(row => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      String(row.issue_scope || '').toLowerCase().includes(search) ||
      String(row.reason || '').toLowerCase().includes(search) ||
      String(row.affected_service || '').toLowerCase().includes(search);
      
    const rowYear = row.start_date ? new Date(row.start_date).getFullYear().toString() : '';
    const matchesYear = yearFilter === 'All' || rowYear === yearFilter;
    const matchesMonth = monthFilter === 'All' || String(row.month || '').toUpperCase() === monthFilter;
    const matchesDept = deptFilter === 'All' || row.responsible_department === deptFilter;
    const matchesApproval = approvalFilter === 'All' || row.maintenance_approval === approvalFilter;
    
    return matchesSearch && matchesYear && matchesMonth && matchesDept && matchesApproval;
  });

  const totalIncidents = filteredData.length;
  const totalDurationHours = filteredData.reduce((sum, item) => sum + (Number(item.duration_hours) || 0), 0).toFixed(1);
  const suddenlyCount = filteredData.filter(item => item.maintenance_approval?.toLowerCase() === 'suddenly').length;

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-muted-foreground font-medium">Loading network incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-8 w-8 text-red-500" />
            Network Incidents
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Track and analyze network issues, downtime, and maintenance scopes.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search scope, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Monthly Report</span>
          </button>
          <Link
            to="/incidents/new"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Record</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 shrink-0">
        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="All">All Years</option>
          {uniqueYears.map(year => (
            <option key={year as string} value={year as string}>{year}</option>
          ))}
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
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="All">All Departments</option>
          {uniqueDepts.map((d: any) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
        >
          <option value="All">All Approvals</option>
          {uniqueApprovals.map((a: any) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-card border-t-4 border-t-red-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Total Incidents</h3>
            <Activity className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{totalIncidents}</span>
          </div>
        </div>
        <div className="bg-card border-t-4 border-t-orange-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Total Duration (Hours)</h3>
            <Calendar className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{totalDurationHours}</span>
          </div>
        </div>
        <div className="bg-card border-t-4 border-t-amber-500 rounded-lg p-4 shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">Sudden Outages</h3>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{suddenlyCount}</span>
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
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Date</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Scope</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Reason</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Department</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Duration</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">Approval</th>
                <th className="p-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No incidents found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
                  const isSudden = row.maintenance_approval?.toLowerCase() === 'suddenly';
                  
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={`hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/20' : ''}`}>
                        <td className="p-3">
                          <button
                            onClick={() => toggleRow(row.id)}
                            className="p-1 hover:bg-muted rounded-md text-muted-foreground"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-3 text-sm font-medium whitespace-nowrap">
                          {row.start_date}
                        </td>
                        <td className="p-3 text-sm font-medium whitespace-nowrap">
                          {row.issue_scope}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground max-w-[200px] truncate" title={row.reason}>
                          {row.reason || '-'}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          {row.responsible_department}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          {row.duration_time}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              isSudden 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                                : row.maintenance_approval?.toLowerCase() === 'yes'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {row.maintenance_approval}
                            </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link 
                            to={`/incidents/${row.id}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 mr-2"
                            title="Edit Incident"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <button 
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => setDeleteRecordId(row.id)}
                            title="Delete Incident"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm pl-10">
                              <div>
                                <h4 className="font-semibold text-muted-foreground mb-1 text-xs uppercase">Time Details</h4>
                                <div className="space-y-1">
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Start:</span>
                                    <span className="font-medium">{row.start_time}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">End:</span>
                                    <span className="font-medium">{row.end_date} {row.end_time}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <span className="text-muted-foreground">Hours / Mins:</span>
                                    <span className="font-medium">{row.duration_hours}h / {row.duration_minutes}m</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-muted-foreground mb-1 text-xs uppercase">Impact & Reason</h4>
                                <div className="space-y-1">
                                  <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="text-muted-foreground">Affected Service:</span>
                                    <span className="font-medium text-foreground">{row.affected_service}</span>
                                  </div>
                                  <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="text-muted-foreground">Reason:</span>
                                    <span className="font-medium text-foreground">{row.reason}</span>
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

      {/* Modern Delete Confirmation Dialog */}
      {deleteRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-lg p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2">Delete Incident</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete this incident record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteRecordId(null)}
                className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <IncidentReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        data={data}
      />
    </div>
  );
}
