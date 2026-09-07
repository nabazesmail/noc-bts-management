import React, { useState, useMemo } from 'react';
import { X, Calendar, Download, Flame, Activity, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#eab308'];

export default function IncidentReportModal({ isOpen, onClose, data }: IncidentReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { filteredRecords, stats, deptChartData, approvalChartData } = useMemo(() => {
    if (!startDate || !endDate) return { filteredRecords: [], stats: { total: 0, duration: 0, sudden: 0 }, deptChartData: [], approvalChartData: [] };

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const filtered = data.filter(row => {
      if (!row.start_date) return false;
      try {
        const rowDate = new Date(row.start_date);
        if (isNaN(rowDate.getTime())) return false;
        return (isAfter(rowDate, start) || isEqual(rowDate, start)) &&
               (isBefore(rowDate, end) || isEqual(rowDate, end));
      } catch (e) {
        return false;
      }
    });

    const total = filtered.length;
    const duration = filtered.reduce((sum, item) => sum + (Number(item.duration_hours) || 0), 0);
    const sudden = filtered.filter(d => String(d.maintenance_approval).toLowerCase() === 'suddenly').length;

    const deptCount: Record<string, number> = {};
    const approvalCount: Record<string, number> = {};

    filtered.forEach(item => {
      const dept = item.responsible_department || 'Unknown';
      const approval = item.maintenance_approval || 'Unknown';
      
      deptCount[dept] = (deptCount[dept] || 0) + 1;
      approvalCount[approval] = (approvalCount[approval] || 0) + 1;
    });

    const deptChart = Object.entries(deptCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const approvalChart = Object.entries(approvalCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      filteredRecords: filtered,
      stats: { total, duration: parseFloat(duration.toFixed(1)), sudden },
      deptChartData: deptChart,
      approvalChartData: approvalChart
    };
  }, [data, startDate, endDate]);

  const handleDownloadPDF = () => {
    setIsDownloading(true);

    setTimeout(() => {
      // @ts-ignore
      if (!window.html2pdf) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        document.body.appendChild(script);
        script.onload = executeDownload;
      } else {
        executeDownload();
      }
    }, 100);
  };

  const executeDownload = () => {
    const element = document.getElementById('incident-report-content');
    if (!element) {
      setIsDownloading(false);
      return;
    }
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `incident-report-${startDate}-to-${endDate}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
      setIsDownloading(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-bold">Network Incidents Report Generator</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap gap-4 items-end shrink-0">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Start Date</label>
            <input 
              type="date" 
              className="w-full bg-background border border-border rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              value={startDate}
              onClick={(e) => (e.target as any).showPicker?.()}
              onKeyDown={(e) => e.preventDefault()}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">End Date</label>
            <input 
              type="date" 
              className="w-full bg-background border border-border rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              value={endDate}
              onClick={(e) => (e.target as any).showPicker?.()}
              onKeyDown={(e) => e.preventDefault()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <button 
            disabled={!startDate || !endDate || isDownloading}
            onClick={handleDownloadPDF}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors h-[38px]"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? "Generating PDF..." : "Export PDF"}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-muted/10">
          {!startDate || !endDate ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p>Please select a date range to generate the report.</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
              <p>No incidents found for this period.</p>
            </div>
          ) : (
            <div id="incident-report-content" className="space-y-6 p-4 rounded-xl bg-background">
              
              <div className="flex flex-col items-center justify-center text-center pb-2 pt-2 border-b border-border">
                <h1 className="text-2xl font-bold">Network Incidents Report</h1>
                <p className="text-muted-foreground mt-1">Period: <span className="font-semibold text-foreground">{startDate}</span> to <span className="font-semibold text-foreground">{endDate}</span></p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border-t-4 border-t-red-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Total Incidents</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.total}</span>
                  </div>
                </div>
                <div className="bg-card border-t-4 border-t-orange-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Total Duration (Hours)</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.duration}</span>
                  </div>
                </div>
                <div className="bg-card border-t-4 border-t-amber-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Sudden Outages</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.sudden}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-4">Incidents by Department</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deptChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name} (${value})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {deptChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-4">Incidents by Maintenance Approval</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={approvalChartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis allowDecimals={false} />
                        <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]}>
                          {approvalChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
