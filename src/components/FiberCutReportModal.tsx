import React, { useState, useMemo } from 'react';
import { X, Calendar, Download, AlertTriangle, Activity, Scissors, Loader2 } from 'lucide-react';
import { parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

interface FiberCutReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#eab308'];

export default function FiberCutReportModal({ isOpen, onClose, data }: FiberCutReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { filteredRecords, stats, typeChartData, regionChartData } = useMemo(() => {
    if (!startDate || !endDate) return { filteredRecords: [], stats: { total: 0, highImpact: 0, backbone: 0, backhaul: 0 }, typeChartData: [], regionChartData: [] };

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
    const highImpact = filtered.filter(d => String(d.noc_cut_evaluation).toLowerCase() === 'high').length;
    const backbone = filtered.filter(d => String(d.cut_type).toLowerCase().includes('backbone')).length;
    const backhaul = filtered.filter(d => String(d.cut_type).toLowerCase().includes('backhaul')).length;

    const typeCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};

    filtered.forEach(item => {
      const type = item.cut_type || 'Unknown';
      const region = item.region_cut_type || 'Unknown';
      
      typeCount[type] = (typeCount[type] || 0) + 1;
      regionCount[region] = (regionCount[region] || 0) + 1;
    });

    const typeChart = Object.entries(typeCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const regionChart = Object.entries(regionCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      filteredRecords: filtered,
      stats: { total, highImpact, backbone, backhaul },
      typeChartData: typeChart,
      regionChartData: regionChart
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
    const element = document.getElementById('fc-report-content');
    if (!element) {
      setIsDownloading(false);
      return;
    }
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `fiber-cuts-report-${startDate}-to-${endDate}.pdf`,
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
            <Calendar className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold">Fiber Cuts Report Generator</h2>
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
              className="w-full bg-background border border-border rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
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
              className="w-full bg-background border border-border rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
              value={endDate}
              onClick={(e) => (e.target as any).showPicker?.()}
              onKeyDown={(e) => e.preventDefault()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <button 
            disabled={!startDate || !endDate || isDownloading}
            onClick={handleDownloadPDF}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium flex items-center gap-2 transition-colors h-[38px]"
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
              <p>No fiber cut records found for this period.</p>
            </div>
          ) : (
            <div id="fc-report-content" className="space-y-6 p-4 rounded-xl bg-background">
              
              <div className="flex flex-col items-center justify-center text-center pb-2 pt-2 border-b border-border">
                <h1 className="text-2xl font-bold">Fiber Cuts Report</h1>
                <p className="text-muted-foreground mt-1">Period: <span className="font-semibold text-foreground">{startDate}</span> to <span className="font-semibold text-foreground">{endDate}</span></p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border-t-4 border-t-blue-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Total Cuts</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.total}</span>
                  </div>
                </div>
                <div className="bg-card border-t-4 border-t-red-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">High Impact</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.highImpact}</span>
                  </div>
                </div>
                <div className="bg-card border-t-4 border-t-orange-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Backbone</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.backbone}</span>
                  </div>
                </div>
                <div className="bg-card border-t-4 border-t-amber-500 rounded-lg p-4 shadow-sm border border-border">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Backhaul</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{stats.backhaul}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-4">Cuts by Type</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name} (${value})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {typeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-4">Cuts by Region</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-45} textAnchor="end" />
                        <YAxis allowDecimals={false} />
                        <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]}>
                          {regionChartData.map((entry, index) => (
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
