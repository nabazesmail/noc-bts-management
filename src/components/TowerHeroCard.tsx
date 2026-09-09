import { useState, useRef } from "react";

export interface TowerHeroCardProps {
  totalSites: number;
  dualBandSites: number;
  singleBandSites: number;
  sitesDown: number;
}

export function TowerHeroCard({ totalSites, dualBandSites, singleBandSites, sitesDown }: TowerHeroCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glowOpacity, setGlowOpacity] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setMousePos({ x, y });
    setGlowOpacity(1);
  };

  const handleMouseLeave = () => {
    setGlowOpacity(0);
  };

  return (
    <div className="relative w-full flex items-center justify-center mb-1">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[280px] rounded-[1.5rem] flex flex-col justify-between overflow-hidden shadow-2xl antialiased group"
        style={{ 
          background: "linear-gradient(145deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.95) 100%)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)"
        }}
      >
        {/* Apple iOS Glass effect base */}
        <div className="absolute inset-0 backdrop-blur-3xl bg-black/10 rounded-[2rem] pointer-events-none" />

        {/* Header */}
        <div className="relative z-20 p-6 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-[0.2em] uppercase">
              <span className="text-[#ff6b00]">Rcell</span> <span className="text-blue-400">Towers</span>
            </span>
            <div className="w-16 h-0.5 bg-blue-500 mt-2 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/30 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
            <span className="text-[9px] font-black tracking-widest text-green-400 uppercase">Online</span>
          </div>
        </div>

        {/* 3D Tower SVG Art */}
        <div className="absolute inset-x-0 bottom-[2px] flex items-end justify-center pointer-events-none">
          
          <div className="relative flex items-end justify-center">
            <svg viewBox="0 0 200 242" overflow="visible" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[240px] w-auto drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-105 relative z-10">
            <g>
              {/* Base Platform */}
              <path d="M60 220 L140 220 L130 240 L70 240 Z" fill="#1e293b" stroke="#334155" strokeWidth="2"/>
              
              {/* Main Lattice Structure */}
              {/* Legs */}
              <line x1="85" y1="220" x2="96" y2="40" stroke="#334155" strokeWidth="3" />
              <line x1="115" y1="220" x2="104" y2="40" stroke="#334155" strokeWidth="3" />
              <line x1="100" y1="220" x2="100" y2="40" stroke="#1e293b" strokeWidth="2" /> {/* Center Support */}

              {/* Cross Bracing */}
              <path d="M85 220 L111 190 L88 160 L108 130 L91 100 L106 70 L94 40" stroke="#475569" strokeWidth="1.5" fill="none" />
              <path d="M115 220 L89 190 L112 160 L92 130 L109 100 L94 70 L106 40" stroke="#1e293b" strokeWidth="1.5" fill="none" />

              {/* Platforms / Mounts */}
              <line x1="80" y1="160" x2="120" y2="160" stroke="#334155" strokeWidth="2" />
              <line x1="84" y1="100" x2="116" y2="100" stroke="#334155" strokeWidth="2" />
              <line x1="90" y1="50" x2="110" y2="50" stroke="#334155" strokeWidth="3" />

              {/* Lower Antennas (Tier 3) */}
              <rect x="76" y="145" width="6" height="20" rx="1" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
              <rect x="118" y="145" width="6" height="20" rx="1" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
              <rect x="97" y="150" width="6" height="15" rx="1" fill="#94a3b8" /> {/* RRU */}

              {/* Middle Antennas (Tier 2) */}
              <rect x="80" y="85" width="7" height="22" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="113" y="85" width="7" height="22" rx="1" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="91" y="90" width="5" height="12" rx="1" fill="#64748b" /> {/* RRU */}
              <rect x="104" y="90" width="5" height="12" rx="1" fill="#64748b" /> {/* RRU */}

              {/* Top Tier (Tier 1) - Main 3-Sector Antennas */}
              {/* Back/Side Sector 1 */}
              <rect x="88" y="25" width="8" height="28" rx="1" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" transform="rotate(-5 92 39)" />
              {/* Back/Side Sector 2 */}
              <rect x="104" y="25" width="8" height="28" rx="1" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" transform="rotate(5 108 39)" />
              {/* Front Sector 3 */}
              <rect x="95" y="28" width="10" height="30" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />

              {/* Lightning Rod / Beacon */}
              <line x1="100" y1="40" x2="100" y2="10" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="100" cy="10" r="2.5" fill="#ef4444" className="animate-pulse" filter="drop-shadow(0 0 4px #ef4444)" />
              
              {/* 2D Radiating Signal Waves (Left & Right) */}
              <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 6" fill="none">
                {[1, 2, 3, 4].map((i) => (
                  <g key={i} className={`animate-signal-${i}`}>
                    {/* Left Arc */}
                    <path d="M 88 0 A 15 15 0 0 0 88 20" />
                    {/* Right Arc */}
                    <path d="M 112 0 A 15 15 0 0 1 112 20" />
                  </g>
                ))}
              </g>
              
              {/* Base lights */}
              <circle cx="85" cy="225" r="1.5" fill="#3b82f6" opacity="0.6" />
              <circle cx="115" cy="225" r="1.5" fill="#3b82f6" opacity="0.6" />
            </g>
          </svg>
         </div>
        </div>

        {/* Footer Metrics - Split to left and right so tower is visible */}
        <div className="absolute inset-x-0 bottom-6 z-20 px-8 flex justify-between items-end pointer-events-none">
          {/* Left Side Metrics */}
          <div className="flex gap-4 pointer-events-auto">
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex flex-col justify-center shadow-lg cursor-default w-36 sm:w-40 hover:bg-white/[0.05] transition-colors">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">Total Sites</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{totalSites}</span>
              </div>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex flex-col justify-center shadow-lg cursor-default w-36 sm:w-40 hover:bg-white/[0.05] transition-colors">
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">Sites Down</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-red-400">{sitesDown}</span>
              </div>
            </div>
          </div>
          
          {/* Right Side Metrics */}
          <div className="flex gap-4 pointer-events-auto">
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex flex-col justify-center shadow-lg cursor-default w-36 sm:w-40 hover:bg-white/[0.05] transition-colors">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1">Single-Band</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{singleBandSites}</span>
              </div>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex flex-col justify-center shadow-lg cursor-default w-36 sm:w-40 hover:bg-white/[0.05] transition-colors">
              <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider mb-1">Dual-Band</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{dualBandSites}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subtle hover gradient spotlight */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-[2rem] z-10"
          style={{ 
            opacity: glowOpacity,
            background: `radial-gradient(800px circle at ${mousePos.x}% ${mousePos.y}%, rgba(59, 130, 246, 0.15), transparent 40%)` 
          }}
        />
      </div>
    </div>
  );
}
