import React from 'react';
import { Compass, Zap, MapPin, Waves, ChevronRight } from 'lucide-react';
import { CLASS_COLORS, getClassColor } from '../services/colors';

export default function PresetSelector({ presets, selectedPreset, onSelectPreset, disabled }) {
  if (!presets || presets.length === 0) return null;

  const current = selectedPreset || presets[0];
  const otherPresets = presets.filter((p) => p.id !== current?.id);
  const currentColor = getClassColor(current.target_type);

  return (
    <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-4 mb-4">
      {/* Section Header: Visibly larger and bolder */}
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/08">
        <div className="flex items-center gap-2 text-[18px] font-mono font-bold text-white tracking-wide">
          <div className="p-1.5 rounded-[2px] bg-[#141414] border border-white/10 text-[#c98a4b]">
            <Zap className="w-4 h-4" />
          </div>
          <span>CALIBRATED MOES SURVEY TRANSECTS</span>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] font-mono text-slate-400">
          <span className="w-2 h-2 rounded-[1px] bg-emerald-500"></span>
          <span>4 Benchmark Datasets Ready</span>
        </div>
      </div>

      {/* Asymmetric State-Driven Layout */}
      <div className="space-y-3">
        {/* 1. Large Active Selected Transect Hero Card */}
        <div className="bg-[#242424] rounded-[2px] p-4 border border-[#c98a4b]/60 relative">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Left Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-mono font-bold px-2.5 py-0.5 rounded-[2px] bg-[#141414] text-[#c98a4b] border border-[#c98a4b]/40">
                  ACTIVE SURVEY TRANSECT
                </span>
                <span
                  className={`text-[12px] font-mono font-bold px-2.5 py-0.5 rounded-[2px] uppercase tracking-wider ${currentColor.badge}`}
                >
                  {current.target_type.replace('_', ' ')} TARGET
                </span>
              </div>

              <h3 className="text-[16px] font-mono font-bold text-white tracking-wide">
                {current.name}
              </h3>

              <p className="text-[14px] font-sans text-slate-300 leading-relaxed max-w-3xl">
                {current.description}
              </p>

              {/* Telemetry Tags */}
              <div className="flex items-center gap-5 text-[13px] font-mono text-slate-300 pt-2.5 border-t border-white/08 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#c98a4b]" />
                  Lat/Lon: <strong className="text-white">{current.nav.vessel_lat.toFixed(4)}°N, {current.nav.vessel_lon.toFixed(4)}°E</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-slate-400" />
                  Heading: <strong className="text-white">{current.nav.heading}° True</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-slate-400" />
                  Altitude: <strong className="text-slate-200">{current.nav.altitude} m</strong>
                </span>
                <span>
                  Swath Width: <strong className="text-slate-200">{current.nav.swath_width_m} m</strong>
                </span>
              </div>
            </div>

            {/* Right Target Box */}
            <div className="hidden md:flex flex-col items-center justify-center p-3.5 rounded-[2px] bg-[#141414] border border-white/08 min-w-[130px] text-center">
              <span className="text-[11px] font-mono text-slate-400 mb-1">TARGET TYPE</span>
              <div
                className="w-3.5 h-3.5 rounded-[1px] mb-1.5"
                style={{ backgroundColor: currentColor.hex }}
              />
              <span className="text-[13px] font-mono font-bold text-slate-200 uppercase">
                {current.target_type.replace('_', ' ')}
              </span>
              <span className="text-[11.5px] font-mono text-slate-400 mt-1">
                {current.filename}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Slim Horizontal Strip for Other Transects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {otherPresets.map((preset) => {
            const pColor = getClassColor(preset.target_type);
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                disabled={disabled}
                className="group flex items-center justify-between p-3 rounded-[2px] bg-[#181818] border border-white/08 hover:border-white/20 hover:bg-[#222222] transition-colors text-left font-mono text-[13px] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-[1px] flex-shrink-0"
                    style={{ backgroundColor: pColor.hex }}
                  />
                  <div className="truncate">
                    <div className="font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                      {preset.name.split('—')[0]}
                    </div>
                    <div className="text-[12px] text-slate-400 truncate mt-0.5">
                      {preset.target_type.replace('_', ' ')} • {preset.nav.vessel_lat.toFixed(2)}°N
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[12px] text-slate-400 group-hover:text-[#c98a4b] flex-shrink-0">
                  <span>Select</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
