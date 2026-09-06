import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, Site } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Radio, Wifi, WifiOff, Target, AlertCircle, SignalHigh, SignalLow, ArrowRight, Scissors, MapPin, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";

export default function Dashboard({ profile }: { profile: Profile | null }) {
  const { theme } = useTheme();
  const [sites, setSites] = useState<Site[]>([]);
  const [fiberCuts, setFiberCuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [sitesRes, fiberCutsRes] = await Promise.all([
      supabase.from("sites").select("*"),
      supabase.from("fiber_cuts").select("*")
    ]);
    if (sitesRes.data) setSites(sitesRes.data);
    if (fiberCutsRes.data) setFiberCuts(fiberCutsRes.data);
    setLoading(false);
  };

  // Helper functions for categorization based on rules and provided screenshots
  const isTurnedOff = (site: Site) => {
    const comm = site.comments?.toLowerCase() || '';
    const enb20 = site.enodb_20?.toLowerCase() || '';
    const enb7 = site.enodb_7?.toLowerCase() || '';

    if (
      comm.includes('out of service') || 
      comm.includes('dismantled') || 
      comm.includes('turned off') || 
      comm.includes('stolen') ||
      comm.includes('off air')
    ) {
      return true;
    }
    
    if (enb20.includes('out of service') || enb7.includes('out of service')) {
      return true;
    }
    
    return false;
  };

  const isDualBand = (site: Site) => {
    if (isTurnedOff(site)) return false;
    const hasB20 = site.b20_on_air_date && site.b20_on_air_date.trim() !== '' && !site.enodb_20?.toLowerCase().includes('not on air');
    const hasB7 = site.b7_on_air_date && site.b7_on_air_date.trim() !== '' && !site.enodb_7?.toLowerCase().includes('not on air');
    return hasB20 && hasB7;
  };

  const isSingleBand = (site: Site) => {
    if (isTurnedOff(site)) return false;
    const hasB20 = site.b20_on_air_date && site.b20_on_air_date.trim() !== '' && !site.enodb_20?.toLowerCase().includes('not on air');
    const hasB7 = site.b7_on_air_date && site.b7_on_air_date.trim() !== '' && !site.enodb_7?.toLowerCase().includes('not on air');
    return (hasB20 && !hasB7) || (!hasB20 && hasB7);
  };

  const isSingleSector = (site: Site) => {
    if (isTurnedOff(site)) return false;
    const b20Sectors = [site.band20_sec_1_cell, site.band20_sec_2_cell, site.band20_sec_3_cell, site.band20_sec_4_cell].filter(c => c && c.trim() !== '');
    const b7Sectors = [site.b7_xa1, site.b7_xb1, site.b7_xc1, site.b7_xd1].filter(c => c && c.trim() !== '');
    
    // Check if it's a very small site with only 1 sector in total
    const totalSectors = b20Sectors.length + b7Sectors.length;
    return totalSectors === 1 || totalSectors === 2 && b20Sectors.length === 1 && b7Sectors.length === 1; 
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">Loading Dashboard...</div>;
  }

  const totalSites = sites.length;
  const turnedOffSites = sites.filter(isTurnedOff);
  const dualBandSites = sites.filter(isDualBand);
  const singleBandSites = sites.filter(isSingleBand);
  const singleSectorSites = sites.filter(isSingleSector);

  // Region Progress Logic
  const allRegions = Array.from(new Set(sites.map(s => s.region))).filter(Boolean).sort();
  const regionProgress = allRegions.map(r => {
    const regionSites = sites.filter(s => s.region === r && !isTurnedOff(s));
    const upgraded = regionSites.filter(isDualBand).length;
    const total = regionSites.length;
    const percentage = total > 0 ? (upgraded / total) * 100 : 0;
    return { region: r, total, upgraded, percentage };
  });

  const totalUpgraded = dualBandSites.length;

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

  // 1. Growth Timeline Data
  const yearCounts: Record<string, number> = {};
  sites.forEach(site => {
    const t20 = parseSiteDate(site.b20_on_air_date);
    const t7 = parseSiteDate(site.b7_on_air_date);
    
    let year = null;
    if (t20 && t7) year = new Date(Math.min(t20, t7)).getFullYear().toString();
    else if (t20) year = new Date(t20).getFullYear().toString();
    else if (t7) year = new Date(t7).getFullYear().toString();
    
    if (year) {
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  });

  let cumulative = 0;
  const timelineData = Object.keys(yearCounts).sort().map(year => {
    cumulative += yearCounts[year];
    return {
      year,
      newSites: yearCounts[year],
      totalSites: cumulative
    };
  });

  // 2. Off-Air Breakdown Data
  let dismantledCount = 0;
  let oosCount = 0;

  turnedOffSites.forEach(site => {
    const comm = site.comments?.toLowerCase() || '';
    const enb20 = site.enodb_20?.toLowerCase() || '';
    const enb7 = site.enodb_7?.toLowerCase() || '';
    
    if (comm.includes('dismantled')) dismantledCount++;
    else if (comm.includes('out of service') || enb20.includes('out of service') || enb7.includes('out of service')) oosCount++;
  });

  const breakdownData = [
    { name: 'Out of Service', value: oosCount, color: '#f59e0b' },
    { name: 'Dismantled', value: dismantledCount, color: '#ef4444' },
  ];

  // Theme logic for charts
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    color: isDark ? '#f3f4f6' : '#111827',
  };
  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const cursorColor = isDark ? '#374151' : '#f3f4f6';

  return (
    <div className="space-y-3">
      
      {/* Top Header Section */}
      <div className="border-b border-border pb-3 mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-blue-500 uppercase flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-400" />
          Operations Dashboard
        </h1>
        <p className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 tracking-wide mt-1">
          Mission Status: Strengthening our network
        </p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        
        <Card className="border-t-4 border-t-blue-500 bg-card border-border shadow-sm">
          <CardHeader className="pb-0 pt-3 items-center">
            <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase text-center">Total Sites</CardTitle>
            <Radio className="h-7 w-7 text-blue-600 dark:text-blue-500 mt-1" />
          </CardHeader>
          <CardContent className="text-center pb-3 pt-1">
            <div className="text-[40px] leading-tight font-black text-foreground">{totalSites}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 bg-card border-border shadow-sm">
          <CardHeader className="pb-0 pt-3 items-center">
            <CardTitle className="text-[11px] font-bold text-green-700 dark:text-green-500 uppercase text-center">Dual-Band Sites</CardTitle>
            <SignalHigh className="h-7 w-7 text-green-600 dark:text-green-400 mt-1" />
          </CardHeader>
          <CardContent className="text-center pb-3 pt-1">
            <div className="text-[40px] leading-tight font-black text-foreground">{dualBandSites.length}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-400 bg-card border-border shadow-sm">
          <CardHeader className="pb-0 pt-3 items-center">
            <CardTitle className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase text-center">Single-Band Sites</CardTitle>
            <SignalLow className="h-7 w-7 text-blue-600 dark:text-blue-400 mt-1" />
          </CardHeader>
          <CardContent className="text-center pb-3 pt-1">
            <div className="text-[40px] leading-tight font-black text-foreground">{singleBandSites.length}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500 bg-card border-border shadow-sm">
          <CardHeader className="pb-0 pt-3 items-center">
            <CardTitle className="text-[11px] font-bold text-red-700 dark:text-red-500 uppercase text-center leading-tight">
              Total Sites Down
            </CardTitle>
            <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-500 mt-1" />
          </CardHeader>
          <CardContent className="text-center pb-3 pt-1">
            <div className="text-[40px] leading-tight font-black text-red-600 dark:text-red-500">{turnedOffSites.length}</div>
          </CardContent>
        </Card>

      </div>

      {/* Second Carrier Deployment Progress */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="text-center pb-0 pt-4">
          <CardTitle className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest">
            Second Carrier Deployment Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 pb-3">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-3 bg-blue-50 dark:bg-muted px-4 py-2 rounded-xl border border-blue-100 dark:border-border">
              <div className="bg-blue-600 p-2 rounded-full text-white">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase leading-tight">Total Upgraded Sites</p>
                <div className="text-3xl font-black text-foreground flex items-baseline gap-2">
                  {totalUpgraded} <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase">Across all regions</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {regionProgress.map((rp, index) => {
              const colors = [
                'bg-blue-500', 'bg-green-500', 'bg-sky-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-rose-500'
              ];
              const colorClass = colors[index % colors.length];

              return (
                <div key={rp.region} className="relative flex flex-col items-center">
                  <div className={`px-3 py-0.5 rounded-t-md text-white font-bold text-xs mb-1.5 ${colorClass}`}>
                    {rp.region || 'Unknown'}
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {rp.upgraded} <span className="text-xs text-muted-foreground font-normal">/ {rp.total}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-bold mb-2 uppercase tracking-wider">Sites</div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden mb-1.5">
                    <div 
                      className={`h-full ${colorClass} transition-all duration-1000`} 
                      style={{ width: `${rp.percentage}%` }}
                    />
                  </div>
                  <div className={`font-bold text-xs ${colorClass.replace('bg-', 'text-')}`}>
                    {rp.percentage.toFixed(1)}%
                  </div>

                  {/* Arrow connector between regions (hide on last) */}
                  {index < regionProgress.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-center text-[10px] font-bold text-blue-600 dark:text-blue-500 tracking-[0.2em] uppercase">
            Deploying Today, Connecting Tomorrow
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase">Network Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pb-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} stroke={axisColor} tick={{fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} stroke={axisColor} tick={{fontSize: 11}} />
                <RechartsTooltip cursor={{stroke: cursorColor, strokeWidth: 1}} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="totalSites" name="Total Sites" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSites)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border flex flex-col h-full">
          <CardHeader className="py-3">
            <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-500" />
              Fiber Cuts Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-4 flex flex-col justify-center gap-4">
            <div className="grid grid-cols-2 gap-4">
              
              {/* Total Cuts */}
              <div className="bg-muted/30 p-3 rounded-lg border border-border text-center flex flex-col justify-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Cuts</div>
                <div className="text-3xl font-black text-foreground flex items-center justify-center gap-2">
                  <Scissors className="h-5 w-5 text-red-500" />
                  {fiberCuts.length}
                </div>
              </div>

              {/* Top Region */}
              <div className="bg-muted/30 p-3 rounded-lg border border-border text-center flex flex-col justify-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Top Region</div>
                <div className="text-2xl font-black text-foreground flex items-center justify-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  {(() => {
                    if (fiberCuts.length === 0) return "-";
                    const regionCounts = fiberCuts.reduce((acc, cut) => {
                      const r = cut.region_cut_type || "Unknown";
                      acc[r] = (acc[r] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const sorted = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);
                    return sorted[0][0];
                  })()}
                </div>
              </div>

              {/* Backbone Cuts */}
              <div className="bg-muted/30 p-3 rounded-lg border border-border text-center flex flex-col justify-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Backbone Cuts</div>
                <div className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  {fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backbone').length}
                </div>
              </div>

              {/* Backhaul Cuts */}
              <div className="bg-muted/30 p-3 rounded-lg border border-border text-center flex flex-col justify-center">
                <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Backhaul Cuts</div>
                <div className="text-2xl font-black text-foreground flex items-center justify-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  {fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backhaul').length}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
