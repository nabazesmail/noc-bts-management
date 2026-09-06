import React, { useState, useMemo } from 'react';
import { X, Calendar, Download, Target, Activity, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SlaTracking } from '../types';
import { parseISO, isAfter, isBefore, isEqual, startOfDay, endOfDay, format } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
interface SlaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SlaTracking[];
}

export default function SlaReportModal({ isOpen, onClose, data }: SlaReportModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slaType, setSlaType] = useState('NOC'); // NOC or SITE
  const [isDownloading, setIsDownloading] = useState(false);

  const { filteredRecords, stats } = useMemo(() => {
    if (!startDate || !endDate) return { filteredRecords: [], stats: { total: 0, yes: 0, no: 0, compliance: 0 }, areaChartData: [] };

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    let yesCount = 0;
    let noCount = 0;

    const filtered = data.filter(row => {
      if (!row.start_date) return false;

      const statusValue = slaType === 'NOC' ? row.noc_sla_status : row.site_sla_status;
      // Filter out 'NA' or empty
      if (!statusValue || statusValue === 'NA' || statusValue === 'na' || statusValue === 'N/A') return false;

      try {
        const rowDate = parseISO(row.start_date);
        const inRange = (isAfter(rowDate, start) || isEqual(rowDate, start)) &&
          (isBefore(rowDate, end) || isEqual(rowDate, end));

        if (inRange) {
          if (statusValue.toLowerCase() === 'yes') yesCount++;
          if (statusValue.toLowerCase() === 'no') noCount++;
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    const total = yesCount + noCount;
    const compliance = total > 0 ? (yesCount / total) * 100 : 0;

    const groupedArea = new Map();
    filtered.forEach(row => {
      try {
        const date = parseISO(row.start_date);
        const day = format(date, 'EEEE');
        const staff = row.noc_staff || '(Blank)';
        const key = `${day}_${staff}`;
        if (!groupedArea.has(key)) {
          groupedArea.set(key, { day, staff, sumSla: 0, sumMtta: 0, sumMttr: 0 });
        }
        const g = groupedArea.get(key);
        g.sumSla += (parseFloat(row.noc_sla || row.site_sla) || 0);
        g.sumMtta += (parseFloat(row.noc_mtta) || 0);
        g.sumMttr += (parseFloat(row.site_mttr) || 0);
      } catch (e) { }
    });

    return {
      filteredRecords: filtered,
      stats: { total, yes: yesCount, no: noCount, compliance }
    };
  }, [data, startDate, endDate, slaType]);

  const handleDownloadPDF = () => {
    setIsDownloading(true);

    // Use setTimeout to yield the main thread so React can paint the "Generating..." spinner
    // before html2canvas locks the thread with heavy synchronous rendering
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
    const wrapper = document.getElementById('pdf-wrapper');
    const element = document.getElementById('pdf-content');
    if (!wrapper || !element) {
      setIsDownloading(false);
      return;
    }

    // Save original styles
    const originalPosition = wrapper.style.position;
    const originalAlignItems = wrapper.style.alignItems;
    const originalMaxHeight = element.style.maxHeight;
    const originalWidth = element.style.width;

    const scrollAreas = element.querySelectorAll('.overflow-auto');
    const originalOverflows: string[] = [];

    // Apply temporary styles for full, unconstrained capture
    wrapper.style.position = 'absolute';
    wrapper.style.alignItems = 'flex-start'; // Prevent growing out of top bounds

    element.style.maxHeight = 'none';
    element.style.width = '1200px'; // Force a wide enough width for the grid layout

    scrollAreas.forEach((area, index) => {
      originalOverflows[index] = (area as HTMLElement).style.overflow;
      (area as HTMLElement).style.overflow = 'visible';
    });

    // Actually hide ignored elements so they don't take up vertical space (preventing blank pages)
    const ignoreElements = element.querySelectorAll('[data-html2canvas-ignore="true"]');
    const originalDisplays: string[] = [];
    ignoreElements.forEach((el, index) => {
      originalDisplays[index] = (el as HTMLElement).style.display;
      (el as HTMLElement).style.display = 'none';
    });

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `SLA_Report_${slaType}_${startDate}_to_${endDate}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#020817',
        scrollY: -window.scrollY // Fix offset issues if the page was scrolled
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
      // Revert styles
      wrapper.style.position = originalPosition;
      wrapper.style.alignItems = originalAlignItems;
      element.style.maxHeight = originalMaxHeight;
      element.style.width = originalWidth;

      scrollAreas.forEach((area, index) => {
        (area as HTMLElement).style.overflow = originalOverflows[index];
      });

      ignoreElements.forEach((el, index) => {
        (el as HTMLElement).style.display = originalDisplays[index];
      });

      setIsDownloading(false);
    });
  };

  const getTargetCompliance = () => slaType === 'NOC' ? '>99%' : '>95%';

  if (!isOpen) return null;

  return (
    <div id="pdf-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-auto">
      <div id="pdf-content" className="bg-background border border-border rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            SLA Compliance Report
          </h2>
          <button data-html2canvas-ignore="true" onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 bg-muted/10 border-b border-border flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">SLA Type</label>
            <select
              value={slaType}
              onChange={(e) => setSlaType(e.target.value)}
              className="flex h-10 w-56 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="NOC">NOC SLA</option>
              <option value="SITE">SITE SLA (OP Department)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onClick={(e) => (e.target as any).showPicker?.()}
              onKeyDown={(e) => e.preventDefault()}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer w-[150px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onClick={(e) => (e.target as any).showPicker?.()}
              onKeyDown={(e) => e.preventDefault()}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer w-[150px]"
            />
          </div>

          <button
            data-html2canvas-ignore="true"
            onClick={handleDownloadPDF}
            disabled={filteredRecords.length === 0 || isDownloading}
            className="ml-auto flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Download PDF'
            )}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-muted/5">
          {(!startDate || !endDate) ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Please select a date range to generate the report.
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No applicable SLA records found in this date range. (NA records are excluded)
            </div>
          ) : (
            <div className="space-y-6 print:space-y-4">

              {/* Report Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-background border border-border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Target {slaType} SLA
                  </div>
                  <div className="text-2xl font-bold">{getTargetCompliance()}</div>
                </div>

                <div className="bg-background border border-border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Current Compliance
                  </div>
                  <div className={`text-3xl font-bold ${stats.compliance >= 99 ? 'text-green-500' : stats.compliance >= 95 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {stats.compliance.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-background border border-border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Met SLA (Yes)
                  </div>
                  <div className="text-2xl font-bold">{stats.yes}</div>
                  <div className="text-xs text-muted-foreground mt-1">out of {stats.total} total tickets</div>
                </div>

                <div className="bg-background border border-border rounded-lg p-4 shadow-sm flex flex-col justify-center">
                  <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Missed SLA (No)
                  </div>
                  <div className="text-2xl font-bold">{stats.no}</div>
                  <div className="text-xs text-muted-foreground mt-1">{((stats.no / stats.total) * 100).toFixed(2)}% of total</div>
                </div>
              </div>

              {/* Chart & Missed SLA Details */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Pie Chart */}
                <div className="bg-background border border-border rounded-lg p-4 shadow-sm flex flex-col items-center justify-center min-h-[300px] lg:col-span-2">
                  <h3 className="font-semibold text-muted-foreground mb-4">Compliance Breakdown</h3>
                  <div className="w-full flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                        <Pie
                          data={[
                            { name: 'Met SLA (Yes)', value: stats.yes },
                            { name: 'Missed SLA (No)', value: stats.no }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="75%"
                          paddingAngle={2}
                          dataKey="value"
                          stroke="transparent"
                          label={({ x, y, value, cx }) => (
                            <text
                              x={x}
                              y={y}
                              fill="currentColor"
                              className="text-foreground text-xs font-medium"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                            >
                              {value} tickets
                            </text>
                          )}
                          labelLine={{ stroke: 'currentColor', className: 'text-muted-foreground', strokeWidth: 1 }}
                        >
                          <Cell key="cell-yes" fill="#0ea5e9" />
                          <Cell key="cell-no" fill="#1e3a8a" />
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-foreground font-medium ml-1">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Missed SLA Details */}
                {stats.no > 0 ? (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 h-full flex flex-col lg:col-span-3">
                    <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Missed SLAs Details
                    </h3>
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-red-500/10 text-red-700">
                          <tr>
                            <th className="px-3 py-2 font-medium">Site</th>
                            <th className="px-3 py-2 font-medium">Date</th>
                            {slaType === 'NOC' ? (
                              <>
                                <th className="px-3 py-2 font-medium">NOC Staff (Shift)</th>
                                <th className="px-3 py-2 font-medium whitespace-nowrap">Announce Time (MTTA)</th>
                              </>
                            ) : (
                              <>
                                <th className="px-3 py-2 font-medium">Responsible Dept</th>
                                <th className="px-3 py-2 font-medium whitespace-nowrap">Actual Outage (MTTR)</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-500/10">
                          {filteredRecords
                            .filter(r => (slaType === 'NOC' ? r.noc_sla_status : r.site_sla_status) === 'No')
                            .map((row, i) => (
                              <tr key={i} className="hover:bg-red-500/5 transition-colors">
                                <td className="px-3 py-2 font-medium whitespace-nowrap">{row.site_code_dc}</td>
                                <td className="px-3 py-2 whitespace-nowrap">{row.start_date}</td>
                                {slaType === 'NOC' ? (
                                  <>
                                    <td className="px-3 py-2 whitespace-nowrap">{row.noc_staff || '-'} (Shift {row.shift || '-'})</td>
                                    <td className="px-3 py-2 font-mono text-red-600 font-medium whitespace-nowrap">{row.noc_mtta} min</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-2 whitespace-nowrap">{row.responsible_department || '-'}</td>
                                    <td className="px-3 py-2 font-mono text-red-600 font-medium whitespace-nowrap">{row.site_mttr} min</td>
                                  </>
                                )}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 h-full flex flex-col items-center justify-center text-green-600 text-center">
                    <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                    <h3 className="font-semibold text-lg">Perfect Score!</h3>
                    <p className="text-sm opacity-80 mt-1">No SLAs were missed in this period.</p>
                  </div>
                )}
              </div>

              {/* Raw Data Table (Visible on Web, Hidden from PDF) */}
              <div className="mt-8" data-html2canvas-ignore="true">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  Raw Data Details (Tickets in Period)
                </h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Site</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Dept</th>
                        <th className="px-4 py-3 font-medium text-center">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRecords.map((row, i) => {
                        const status = slaType === 'NOC' ? row.noc_sla_status : row.site_sla_status;
                        return (
                          <tr key={i} className="hover:bg-muted/50 transition-colors bg-background">
                            <td className="px-4 py-3 font-medium">{row.site_code_dc}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{row.start_date}</td>
                            <td className="px-4 py-3">{row.responsible_department}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.toLowerCase() === 'yes' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{row.duration_time}</td>
                          </tr>
                        );
                      })}
                      {filteredRecords.length === 0 && (
                        <tr className="bg-background">
                          <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                            No tickets found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
