import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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
import { parseSiteDate } from "@/lib/utils";
import { TowerHeroCard } from "@/components/TowerHeroCard";

export default function Dashboard({ profile }: { profile: Profile | null }) {
  const { theme } = useTheme();
  const [sites, setSites] = useState<Site[]>([]);
  const [fiberCuts, setFiberCuts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sitesRes, fiberCutsRes] = await Promise.all([
        api.get("/sites"),
        api.get("/fiber_cuts")
      ]);
      if (sitesRes.data) setSites(sitesRes.data);
      if (fiberCutsRes.data) setFiberCuts(fiberCutsRes.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
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



  // 1. Growth Timeline Data
  const yearCounts: Record<string, number> = {};
  let sitesWithDates = 0;
  
  sites.forEach(site => {
    const t20 = parseSiteDate(site.b20_on_air_date);
    const t7 = parseSiteDate(site.b7_on_air_date);
    
    let year = null;
    if (t20 && t7) year = new Date(Math.min(t20, t7)).getFullYear().toString();
    else if (t20) year = new Date(t20).getFullYear().toString();
    else if (t7) year = new Date(t7).getFullYear().toString();
    
    if (year) {
      yearCounts[year] = (yearCounts[year] || 0) + 1;
      sitesWithDates++;
    }
  });

  // Start cumulative with sites that are missing dates, so the final total perfectly matches sites.length
  let cumulative = sites.length - sitesWithDates;
  
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
      <div className="border-b border-border pb-3 mb-2 animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight text-blue-500 uppercase flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-400" />
          NOC Management System
        </h1>
        <p className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 tracking-wide mt-1">
          Mission Status: Strengthening our network
        </p>
      </div>

      {/* 3D Tower Hero */}
      <div className="animate-fade-in-up stagger-1">
        <TowerHeroCard 
          totalSites={totalSites} 
          dualBandSites={dualBandSites.length} 
          singleBandSites={singleBandSites.length} 
          sitesDown={turnedOffSites.length} 
        />
      </div>

      {/* Second Carrier Deployment Progress */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black tracking-widest text-muted-foreground uppercase">Carrier Deployment Progress</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 animate-fade-in-up stagger-5">
          {/* Total Card */}
          <Card className="md:col-span-1 bg-gradient-to-br from-blue-600 to-blue-900 border-none text-white relative overflow-hidden modern-card shadow-lg shadow-blue-900/20">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-blue-400/20 rounded-full blur-xl pointer-events-none"></div>
            <CardContent className="p-4 flex flex-col justify-between h-full relative z-10 min-h-[120px]">
              <div>
                 <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center mb-2 backdrop-blur-md border border-white/10 shadow-inner">
                   <Wifi className="text-white h-4 w-4" />
                 </div>
                 <p className="text-white/80 font-bold text-[9px] uppercase tracking-widest mb-1">Total Upgraded</p>
              </div>
              <div className="mt-2">
                 <div className="text-4xl font-black tracking-tighter leading-none">{totalUpgraded}</div>
                 <p className="text-white/60 text-[8px] font-semibold uppercase mt-1.5 tracking-widest">Across all regions</p>
              </div>
            </CardContent>
          </Card>

          {/* Region Cards */}
          {regionProgress.map((rp, index) => {
            const colorMaps = [
              { bg: 'bg-blue-500', text: 'text-blue-500' },
              { bg: 'bg-green-500', text: 'text-green-500' },
              { bg: 'bg-sky-500', text: 'text-sky-500' },
              { bg: 'bg-purple-500', text: 'text-purple-500' },
              { bg: 'bg-orange-500', text: 'text-orange-500' },
              { bg: 'bg-teal-500', text: 'text-teal-500' },
              { bg: 'bg-rose-500', text: 'text-rose-500' }
            ];
            const currentColors = colorMaps[index % colorMaps.length];
            
            return (
             <Card key={rp.region} className="bg-card border-border relative overflow-hidden modern-card group hover:border-muted-foreground/30 transition-colors">
               {/* Subtle watermark */}
               <div className="absolute -right-4 -bottom-4 text-6xl font-black text-muted/5 group-hover:text-muted/10 transition-colors pointer-events-none select-none">
                 {rp.region === 'RC' ? 'RC' : (rp.region ? `R${rp.region}` : '?')}
               </div>
               
               <CardContent className="p-4 flex flex-col h-full justify-between relative z-10 min-h-[120px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                       <div className={`text-[10px] font-black tracking-widest uppercase ${currentColors.text}`}>
                         REGION {rp.region === 'RC' ? 'RC' : (rp.region ? `${rp.region}` : 'Unknown')}
                       </div>
                       <div className="text-right">
                          <div className="text-sm font-black text-foreground leading-none">{rp.upgraded} <span className="text-muted-foreground font-medium text-[10px]">/ {rp.total}</span></div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">
                      <span>Progress</span>
                      <span className={currentColors.text}>{rp.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                       <div className={`h-full ${currentColors.bg} transition-all duration-1000 relative shadow-[0_0_8px_rgba(0,0,0,0.5)]`} style={{ width: `${rp.percentage}%` }}>
                          <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-[2px]"></div>
                       </div>
                    </div>
                  </div>
               </CardContent>
             </Card>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-card border-border modern-card animate-fade-in-up stagger-6">
          <CardHeader className="py-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Network Growth</CardTitle>
          </CardHeader>
          <CardContent className="pb-2 pt-0">
            <div className="h-[200px] w-full">
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
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border flex flex-col h-full modern-card animate-fade-in-up stagger-7">
          <CardHeader className="py-2">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
              <Activity className="h-3 w-3 text-red-500" />
              Fiber Cuts Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-2 pb-3">
            <div className="grid grid-cols-2 gap-4">
              
              {/* Total Cuts */}
              <div className="bg-muted/30 p-2 rounded-lg border border-border/50 col-span-2">
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Total Cuts</div>
                <div className="text-xl font-black text-foreground flex items-center gap-2">
                  <Scissors className="h-3 w-3 text-red-500" />
                  {fiberCuts.length}
                </div>
              </div>
              <div className="bg-muted/30 p-2 rounded-lg border border-border/50 col-span-2">
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Top Region</div>
                <div className="text-lg font-black text-foreground flex items-center gap-1.5 truncate">
                  <MapPin className="h-3 w-3 text-orange-500" />
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

              <div className="grid grid-cols-4 gap-2 col-span-2">
                <div className="bg-muted/30 p-2 rounded-lg border border-border/50 col-span-2">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Backbone Cuts</div>
                  <div className="text-lg font-black text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    {fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backbone').length}
                  </div>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg border border-border/50 col-span-2">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Backhaul Cuts</div>
                  <div className="text-lg font-black text-foreground flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-blue-500" />
                    {fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backhaul').length}
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
