import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Profile, Site } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Radio, Wifi, WifiOff, Target, AlertCircle, SignalHigh, SignalLow, ArrowRight, Scissors, MapPin, AlertTriangle, LayoutDashboard, Server, RadioTower, CheckCircle2 } from "lucide-react";
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

const UPTIME_WARNING_THRESHOLD = 90;

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
    
    const b20Down = enb20.includes('out of service') || enb20.includes('not on air') || enb20.includes('off air') || !enb20;
    const b7Down = enb7.includes('out of service') || enb7.includes('not on air') || enb7.includes('off air') || !enb7;
    
    // A site is only "down" if BOTH bands are down, and at least one is explicitly "out of service" or "off air"
    // (to prevent marking unbuilt/planned sites as down)
    if (b20Down && b7Down && (
      enb20.includes('out of service') || enb7.includes('out of service') ||
      enb20.includes('off air') || enb7.includes('off air')
    )) {
      return true;
    }
    
    return false;
  };

  const isDualBand = (site: Site) => {
    if (isTurnedOff(site)) return false;
    const hasB20 = site.b20_on_air_date && site.b20_on_air_date.trim() !== '' && !site.enodb_20?.toLowerCase().includes('not on air') && !site.enodb_20?.toLowerCase().includes('out of service') && !site.enodb_20?.toLowerCase().includes('off air');
    const hasB7 = site.b7_on_air_date && site.b7_on_air_date.trim() !== '' && !site.enodb_7?.toLowerCase().includes('not on air') && !site.enodb_7?.toLowerCase().includes('out of service') && !site.enodb_7?.toLowerCase().includes('off air');
    return hasB20 && hasB7;
  };

  const isSingleBand = (site: Site) => {
    if (isTurnedOff(site)) return false;
    const hasB20 = site.b20_on_air_date && site.b20_on_air_date.trim() !== '' && !site.enodb_20?.toLowerCase().includes('not on air') && !site.enodb_20?.toLowerCase().includes('out of service') && !site.enodb_20?.toLowerCase().includes('off air');
    const hasB7 = site.b7_on_air_date && site.b7_on_air_date.trim() !== '' && !site.enodb_7?.toLowerCase().includes('not on air') && !site.enodb_7?.toLowerCase().includes('out of service') && !site.enodb_7?.toLowerCase().includes('off air');
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

  const isCombined = (site: Site) => {
    if (isTurnedOff(site)) return false;
    const val = site.combined_both_bands?.toLowerCase().trim();
    return val === 'yes' || val === 'true' || val === '1' || val === 'combined';
  };

  const { totalSites, turnedOffSites, dualBandSites, singleBandSites, singleSectorSites, combinedSites } = useMemo(() => {
    return {
      totalSites: sites.length,
      turnedOffSites: sites.filter(isTurnedOff),
      dualBandSites: sites.filter(isDualBand),
      singleBandSites: sites.filter(isSingleBand),
      singleSectorSites: sites.filter(isSingleSector),
      combinedSites: sites.filter(isCombined)
    };
  }, [sites]);

  // Region Progress Logic
  const regionProgress = useMemo(() => {
    const allRegions = Array.from(new Set(sites.map(s => s.region))).filter(Boolean).sort();
    return allRegions.map(r => {
      const regionSites = sites.filter(s => s.region === r);
      const total = regionSites.length;
      const upSites = regionSites.filter(s => !isTurnedOff(s)).length;
      const percentage = total > 0 ? (upSites / total) * 100 : 0;
      return { region: r, total, upSites, percentage };
    });
  }, [sites]);

  const totalSitesUp = totalSites - turnedOffSites.length;
  const totalUptimePct = totalSites > 0 ? (totalSitesUp / totalSites) * 100 : 0;



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

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-3">
      
      {/* Top Header Section */}
      <div className="flex items-center gap-2 mb-4 animate-fade-in-up">
        <LayoutDashboard className="w-8 h-8 text-white drop-shadow-md" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white uppercase">
            NOC Management System
          </h1>
          <p className="text-xs font-medium text-gray-300 dark:text-gray-400 tracking-wide mt-0.5">
            Mission Status: Strengthening our network
          </p>
        </div>
      </div>

      {/* 3D Tower Hero */}
      <div className="animate-fade-in-up stagger-1">
        <TowerHeroCard 
          totalSites={totalSites} 
          dualBandSites={dualBandSites.length} 
          singleBandSites={singleBandSites.length} 
          combinedSites={combinedSites.length}
          sitesDown={turnedOffSites.length} 
        />
      </div>

      {/* Region Uptime Status */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black tracking-widest text-muted-foreground uppercase">Region Uptime Status</h2>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 animate-fade-in-up stagger-5">
          {/* Total Card */}
          <Card className="col-span-full lg:col-span-1 bg-blue-600 border-none text-white relative overflow-hidden modern-card shadow-lg">
            <CardContent className="p-4 flex flex-col h-full justify-between relative z-10 min-h-[120px]">
              <div>
                <div className="flex justify-between items-start mb-2">
                   <div className="text-xs font-black tracking-widest uppercase text-blue-200 drop-shadow-sm">
                     TOTAL ONLINE
                   </div>
                   <div className="text-right">
                      <div className="text-base font-black text-white leading-none">{totalSitesUp} <span className="text-blue-200/70 font-medium text-xs">/ {totalSites}</span></div>
                   </div>
                </div>
              </div>
              
              <div className="mt-2 flex justify-between items-end">
                <div className="flex flex-col gap-1 pb-1">
                  <div className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">
                    Uptime
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-blue-900/40 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] shrink-0">
                  <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90 absolute inset-0 drop-shadow-md overflow-visible">
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-blue-900/30" />
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-white" strokeDasharray="263.89" strokeDashoffset={263.89 - (263.89 * totalUptimePct) / 100} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }} />
                  </svg>
                  <div className="text-sm font-black text-white tracking-tighter">
                     {totalUptimePct.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Region Cards */}
          {regionProgress.map((rp, index) => {
            const isPassing = rp.percentage >= UPTIME_WARNING_THRESHOLD;
            
            const currentColors = isPassing 
              ? { bg: 'bg-[#22c55e]', text: 'text-[#4ade80]', border: 'border-transparent', icon: CheckCircle2 }
              : { bg: 'bg-[#ef4444]', text: 'text-[#f87171]', border: 'border-red-500/50', icon: AlertTriangle };
            
            return (
             <Card key={rp.region} className={`bg-card relative overflow-hidden modern-card group transition-colors border ${currentColors.border}`}>
               {/* Subtle watermark */}
               <div className="absolute -right-4 -bottom-4 text-6xl font-black text-muted/5 group-hover:text-muted/10 transition-colors pointer-events-none select-none">
                 {rp.region === 'RC' ? 'RC' : (rp.region ? `R${rp.region}` : '?')}
               </div>
               
               <CardContent className="p-4 flex flex-col h-full justify-between relative z-10 min-h-[120px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                       <div className={`text-xs font-black tracking-widest uppercase drop-shadow-sm ${currentColors.text}`}>
                         REGION {rp.region === 'RC' ? 'RC' : (rp.region ? `${rp.region}` : 'Unknown')}
                       </div>
                       <div className="text-right">
                          <div className="text-base font-black text-foreground leading-none">{rp.upSites} <span className="text-muted-foreground font-medium text-xs">/ {rp.total}</span></div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-between items-end">
                    <div className="flex flex-col gap-1 pb-1">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        Uptime
                      </div>
                      <currentColors.icon className={`w-5 h-5 drop-shadow-sm ${currentColors.text}`} />
                    </div>
                    
                    <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-black/5 dark:bg-black/20 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)] shrink-0">
                      <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90 absolute inset-0 drop-shadow-sm overflow-visible">
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted/20" />
                        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className={`stroke-current ${currentColors.text}`} strokeDasharray="263.89" strokeDashoffset={263.89 - (263.89 * rp.percentage) / 100} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }} />
                      </svg>
                      <div className={`text-sm font-black ${currentColors.text} tracking-tighter`}>
                         {rp.percentage.toFixed(1)}%
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} strokeOpacity={0.2} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} stroke={axisColor} tick={{fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} stroke={axisColor} tick={{fontSize: 11}} />
                  <RechartsTooltip cursor={{stroke: cursorColor, strokeWidth: 1}} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="totalSites" name="Total Sites" stroke="#60a5fa" strokeWidth={4} fillOpacity={1} fill="url(#colorSites)" />
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
            <div className="grid grid-cols-2 gap-2 md:gap-4 h-full">
              
              {/* Total Cuts */}
              <div className="bg-muted/10 hover:bg-muted/20 transition-colors p-4 rounded-xl border border-border/50 flex flex-col items-center text-center justify-center gap-2 shadow-sm h-full">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Cuts</div>
                <div className="text-3xl font-black text-foreground flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-red-500" />
                  {fiberCuts.length}
                </div>
              </div>
              
              {/* Top Region */}
              <div className="bg-muted/10 hover:bg-muted/20 transition-colors p-4 rounded-xl border border-border/50 flex flex-col items-center text-center justify-center gap-2 shadow-sm h-full">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Region</div>
                <div className="text-2xl font-black text-foreground flex items-center gap-2 truncate">
                  <MapPin className="h-5 w-5 text-orange-500" />
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
              <div className="bg-red-500/5 hover:bg-red-500/10 transition-colors p-2 md:p-4 rounded-xl border border-red-500/20 flex flex-col items-center text-center justify-center gap-2 shadow-sm group h-full overflow-hidden">
                <div className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider group-hover:text-red-500 transition-colors">Backbone</div>
                <div className="text-xl md:text-3xl font-black text-red-500 flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
                  <div className="flex items-center justify-between bg-red-500/10 p-1 md:p-1.5 px-1.5 md:px-2 rounded-lg border border-red-500/20 text-red-500 opacity-90 scale-75 md:scale-90">
                     <Server className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                     <div className="w-1.5 md:w-3 h-[2px] bg-red-500/40 mx-0.5 md:mx-1"></div>
                     <Scissors className="h-3 w-3 md:h-4 md:w-4 rotate-90 text-red-400 shrink-0" />
                     <div className="w-1.5 md:w-3 h-[2px] bg-red-500/40 mx-0.5 md:mx-1"></div>
                     <Server className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                  </div>
                  <span>{fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backbone').length}</span>
                </div>
              </div>

              {/* Backhaul Cuts */}
              <div className="bg-red-500/5 hover:bg-red-500/10 transition-colors p-2 md:p-4 rounded-xl border border-red-500/20 flex flex-col items-center text-center justify-center gap-2 shadow-sm group h-full overflow-hidden">
                <div className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider group-hover:text-red-500 transition-colors">Backhaul</div>
                <div className="text-xl md:text-3xl font-black text-red-500 flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
                  <div className="flex items-center justify-between bg-red-500/10 p-1 md:p-1.5 px-1.5 md:px-2 rounded-lg border border-red-500/20 text-red-500 opacity-90 scale-75 md:scale-90">
                     <RadioTower className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                     <div className="w-1.5 md:w-3 h-[2px] bg-red-500/40 mx-0.5 md:mx-1"></div>
                     <Scissors className="h-3 w-3 md:h-4 md:w-4 rotate-90 text-red-400 shrink-0" />
                     <div className="w-1.5 md:w-3 h-[2px] bg-red-500/40 mx-0.5 md:mx-1"></div>
                     <RadioTower className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
                  </div>
                  <span>{fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backhaul').length}</span>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
