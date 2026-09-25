import React from 'react';
import { Target, AlertTriangle, ShieldAlert, Waves } from 'lucide-react';
import { CLASS_COLORS } from '../services/colors';

export default function MetricCards({ summary, processingTimeMs, missionId }) {
  const s = summary || {
    total_detections: 0,
    critical_hazards: 0,
    high_hazards: 0,
    ghost_nets: 0,
    unknown_anomalies: 0,
    wreckages: 0,
    pipes: 0,
    cylinders: 0
  };

  const highOrCritical = (s.critical_hazards || 0) + (s.high_hazards || 0);

  const cards = [
    {
      title: 'TOTAL TARGETS DETECTED',
      value: s.total_detections ?? 0,
      subtext: missionId ? `Mission Ref: ${missionId}` : 'Awaiting Acoustic Ingestion',
      icon: Target,
      badge: processingTimeMs ? `${processingTimeMs} ms` : 'Standby',
      badgeColor: 'bg-[#181818] text-slate-300 border border-white/10',
      iconColor: 'text-[#c98a4b]'
    },
    {
      title: 'HIGH & CRITICAL HAZARDS',
      value: highOrCritical,
      subtext: `${s.critical_hazards || 0} Critical, ${s.high_hazards || 0} High Threat`,
      icon: ShieldAlert,
      badge: highOrCritical > 0 ? 'ALERT ACTIVE' : 'CLEAR',
      badgeColor: highOrCritical > 0 ? 'bg-[#c54b4b]/15 text-[#c54b4b] border border-[#c54b4b]/40 font-bold' : 'bg-[#181818] text-slate-400 border border-white/10',
      iconColor: 'text-[#c54b4b]'
    },
    {
      title: 'GHOST FISHING NETS',
      value: s.ghost_nets ?? 0,
      subtext: 'Entanglement & Ecological Risk',
      icon: AlertTriangle,
      badge: `${s.ghost_nets || 0} Identified`,
      badgeColor: 'bg-[#d4a343]/15 text-[#d4a343] border border-[#d4a343]/40',
      iconColor: 'text-[#d4a343]'
    },
    {
      title: 'ANOMALIES & WRECKAGE',
      value: (s.unknown_anomalies || 0) + (s.wreckages || 0) + (s.pipes || 0) + (s.cylinders || 0),
      subtext: `${s.wreckages || 0} Wrecks, ${s.pipes || 0} Pipes, ${s.cylinders || 0} Cyl`,
      icon: Waves,
      badge: 'Bathymetric Obstacles',
      badgeColor: 'bg-[#181818] text-slate-400 border border-white/10',
      iconColor: 'text-[#4b7bc9]'
    },
  ];

  return (
    <div className="relative bathymetric-watermark rounded-[2px] overflow-hidden">
      {/* SVG Nautical Isobath Contour Lines Watermark (< 2.5% opacity) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025] text-white"
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,30 Q250,70 500,20 T1000,40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6,6" />
        <path d="M0,65 Q220,110 520,55 T1000,80" fill="none" stroke="currentColor" strokeWidth="1.0" />
        <path d="M0,105 Q300,160 550,90 T1000,120" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4,8" />
        <path d="M0,145 Q200,195 480,130 T1000,160" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <path d="M0,180 Q350,210 600,165 T1000,190" fill="none" stroke="currentColor" strokeWidth="1.0" strokeDasharray="5,5" />
      </svg>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-[#1f1f1f] border border-white/08 p-4 rounded-[2px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-mono font-bold tracking-wider text-slate-300 uppercase">
                  {c.title}
                </span>
                <div className="p-1.5 rounded-[2px] bg-[#141414] border border-white/08">
                  <Icon className={`w-4 h-4 ${c.iconColor}`} />
                </div>
              </div>

              <div className="my-3 flex items-baseline justify-between">
                <span className="text-[38px] font-extrabold font-mono tracking-tight text-white leading-none">
                  {c.value}
                </span>
                <span className={`text-[12px] font-mono px-2.5 py-0.5 rounded-[2px] ${c.badgeColor}`}>
                  {c.badge}
                </span>
              </div>

              <div className="text-[13px] font-mono text-slate-400 truncate pt-2.5 border-t border-white/06 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#c98a4b]"></span>
                <span className="truncate">{c.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
