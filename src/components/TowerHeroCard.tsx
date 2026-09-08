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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          
          {/* Signal Waves */}
          <div className="absolute inset-0 flex items-center justify-center top-[-100px] opacity-60">
            <div className="w-56 h-20 rounded-[100%] border border-dashed border-blue-400/20 absolute animate-[ping_4s_ease-out_infinite]" />
            <div className="w-80 h-28 rounded-[100%] border border-dashed border-blue-400/10 absolute animate-[ping_4s_ease-out_infinite_1s]" />
            <div className="w-[26rem] h-[9rem] rounded-[100%] border border-dashed border-blue-400/5 absolute animate-[ping_4s_ease-out_infinite_2s]" />
          </div>
          
          <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[220px] w-auto mt-2 drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-105">
            <g>
              {/* Base Platform */}
              <path d="M50 220 L150 220 L140 240 L60 240 Z" fill="#1e293b" stroke="#334155" strokeWidth="2"/>
              {/* Central Mast */}
              <rect x="95" y="40" width="10" height="180" fill="#334155" />
              <rect x="97" y="40" width="2" height="180" fill="#475569" />
              
              {/* Support Beams Left */}
              <line x1="95" y1="60" x2="60" y2="220" stroke="#1e293b" strokeWidth="4" />
              <line x1="95" y1="120" x2="65" y2="180" stroke="#1e293b" strokeWidth="3" />
              <line x1="95" y1="180" x2="70" y2="140" stroke="#1e293b" strokeWidth="3" />
              
              {/* Support Beams Right */}
              <line x1="105" y1="60" x2="140" y2="220" stroke="#1e293b" strokeWidth="4" />
              <line x1="105" y1="120" x2="135" y2="180" stroke="#1e293b" strokeWidth="3" />
              <line x1="105" y1="180" x2="130" y2="140" stroke="#1e293b" strokeWidth="3" />
              
              {/* Antennas */}
              <rect x="80" y="70" width="8" height="30" rx="2" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
              <rect x="112" y="70" width="8" height="30" rx="2" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
              
              {/* Top Beacon */}
              <rect x="98" y="25" width="4" height="15" fill="#cbd5e1" />
              <circle cx="100" cy="20" r="3" fill="#ef4444" className="animate-pulse" filter="drop-shadow(0 0 5px #ef4444)" />
              
              {/* Base lights */}
              <circle cx="80" cy="230" r="1.5" fill="#3b82f6" opacity="0.5" />
              <circle cx="100" cy="230" r="1.5" fill="#3b82f6" opacity="0.5" />
              <circle cx="120" cy="230" r="1.5" fill="#3b82f6" opacity="0.5" />
            </g>
          </svg>
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
