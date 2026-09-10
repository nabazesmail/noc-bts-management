import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Profile, Site } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Radio, Wifi, WifiOff, Target, AlertCircle, SignalHigh, SignalLow, ArrowRight, Scissors, MapPin, AlertTriangle, LayoutDashboard, Server, RadioTower } from "lucide-react";
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
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 animate-fade-in-up stagger-5">
          {/* Total Card */}
          <Card className="md:col-span-1 bg-gradient-to-br from-blue-600 to-blue-900 border-none text-white relative overflow-hidden modern-card shadow-lg shadow-blue-900/20">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-blue-400/20 rounded-full blur-xl pointer-events-none"></div>
            <CardContent className="p-4 flex flex-col justify-between h-full relative z-10 min-h-[120px]">
              <div>
                 <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center mb-2 backdrop-blur-md border border-white/10 shadow-inner">
                   <Activity className="text-white h-4 w-4" />
                 </div>
                 <p className="text-white/80 font-bold text-[9px] uppercase tracking-widest mb-1">Total Online Sites</p>
              </div>
              <div className="mt-2">
                 <div className="text-4xl font-black tracking-tighter leading-none">{totalSitesUp}</div>
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
            const r = rp.region?.toString().toLowerCase().replace('region ', '').trim();
            const isRegion3 = r === '3';
            const isRegion4 = r === '4';
            
            let currentColors = colorMaps[index % colorMaps.length];
            if (isRegion3) currentColors = { bg: 'bg-[#a855f7]', text: 'text-[#a855f7]' }; // Purple
            else if (isRegion4) currentColors = { bg: 'bg-[#ff6b00]', text: 'text-[#ff6b00]' }; // Orange
            
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
                          <div className="text-sm font-black text-foreground leading-none">{rp.upSites} <span className="text-muted-foreground font-medium text-[10px]">/ {rp.total}</span></div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase mb-1.5 tracking-wider">
                      <span>Uptime</span>
                      <span className={currentColors.text}>{rp.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted/40 h-1.5 rounded-full relative mt-2">
                       <div className={`h-full ${currentColors.bg} rounded-full transition-all duration-1000 relative`} style={{ width: `${rp.percentage}%` }}>
                          {/* Glowing Dot at tip */}
                          <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full ${currentColors.text}`} style={{ boxShadow: '0 0 10px 2px currentColor' }}></div>
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
            <div className="grid grid-cols-2 gap-4 h-full">
              
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
              <div className="bg-red-500/5 hover:bg-red-500/10 transition-colors p-4 rounded-xl border border-red-500/20 flex flex-col items-center text-center justify-center gap-2 shadow-sm group h-full">
                <div className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider group-hover:text-red-500 transition-colors">Backbone</div>
                <div className="text-3xl font-black text-red-500 flex items-center gap-2">
                  <div className="flex items-center justify-between w-28 bg-red-500/10 p-1.5 px-2 rounded-lg border border-red-500/20 text-red-500 opacity-90 scale-90 mr-2">
                     <Server className="h-5 w-5 shrink-0" />
                     <div className="flex-1 h-[2px] bg-red-500/40 mx-1"></div>
                     <Scissors className="h-4 w-4 rotate-90 text-red-400 shrink-0" />
                     <div className="flex-1 h-[2px] bg-red-500/40 mx-1"></div>
                     <Server className="h-5 w-5 shrink-0" />
                  </div>
                  {fiberCuts.filter(c => c.cut_type?.toLowerCase() === 'backbone').length}
                </div>
              </div>

              {/* Backhaul Cuts */}
              <div className="bg-red-500/5 hover:bg-red-500/10 transition-colors p-4 rounded-xl border border-red-500/20 flex flex-col items-center text-center justify-center gap-2 shadow-sm group h-full">
                <div className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider group-hover:text-red-500 transition-colors">Backhaul</div>
                <div className="text-3xl font-black text-red-500 flex items-center gap-2">
                  <div className="flex items-center justify-between w-28 bg-red-500/10 p-1.5 px-2 rounded-lg border border-red-500/20 text-red-500 opacity-90 scale-90 mr-2">
                     <RadioTower className="h-5 w-5 shrink-0" />
                     <div className="flex-1 h-[2px] bg-red-500/40 mx-1"></div>
                     <Scissors className="h-4 w-4 rotate-90 text-red-400 shrink-0" />
                     <div className="flex-1 h-[2px] bg-red-500/40 mx-1"></div>
                     <RadioTower className="h-5 w-5 shrink-0" />
                  </div>
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
