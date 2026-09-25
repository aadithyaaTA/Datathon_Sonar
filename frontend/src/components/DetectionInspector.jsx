import React from 'react';
import { 
  ShieldCheck, AlertTriangle, Crosshair, MapPin, 
  Activity, CheckCircle2, XCircle, Sparkles, Compass, Waves 
} from 'lucide-react';
import { CLASS_COLORS, getClassColor } from '../services/colors';

export default function DetectionInspector({ detection, vesselPos }) {
  if (!detection) {
    return (
      <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-6 flex flex-col items-center justify-center min-h-[350px] text-center">
        <div className="w-14 h-14 rounded-[2px] bg-[#141414] border border-white/10 flex items-center justify-center text-slate-500 mb-3">
          <Crosshair className="w-7 h-7" />
        </div>
        <h4 className="text-[18px] font-mono font-bold text-white uppercase tracking-wide mb-2">
          ACOUSTIC ANOMALY INSPECTOR
        </h4>
        <p className="text-[14px] font-sans text-slate-400 max-w-sm leading-relaxed">
          Select any target from the swath tray above or click a map marker to inspect its physics verification metrics and calculated coordinates.
        </p>
      </div>
    );
  }

  const {
    id, class_name, model_confidence, acoustic_score, final_score,
    hazard_level, shadow_detected, latitude, longitude,
    physics_details, geo_details, crop_image_url
  } = detection;

  const targetColor = getClassColor(class_name);

  const getHazardBadgeStyle = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-[#c54b4b]/15 text-[#c54b4b] border border-[#c54b4b]/40 font-bold';
      case 'HIGH':
        return 'bg-[#c98a4b]/15 text-[#c98a4b] border border-[#c98a4b]/40 font-bold';
      case 'MEDIUM':
        return 'bg-[#d4a343]/15 text-[#d4a343] border border-[#d4a343]/40 font-bold';
      default:
        return 'bg-[#4b7bc9]/15 text-[#4b7bc9] border border-[#4b7bc9]/40 font-bold';
    }
  };

  return (
    <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-4 flex flex-col gap-4">
      {/* Header: Visibly larger and bolder */}
      <div className="flex items-center justify-between pb-3 border-b border-white/08">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] font-mono font-bold px-2 py-0.5 rounded-[2px] bg-[#141414] border border-white/10 text-slate-300">
              {id}
            </span>
            <span
              className="w-3 h-3 rounded-[1px]"
              style={{ backgroundColor: targetColor.hex }}
            />
            <h3 className="text-[18px] font-mono font-bold text-white uppercase tracking-wide">
              {class_name.replace('_', ' ')}
            </h3>
          </div>
          <p className="text-[12.5px] font-mono text-slate-400 mt-1">
            Physics-Informed Acoustic Verification
          </p>
        </div>

        <div className={`px-3 py-1 rounded-[2px] text-[12.5px] font-mono tracking-wider ${getHazardBadgeStyle(hazard_level)}`}>
          {hazard_level} HAZARD ({Math.round(final_score * 100)}%)
        </div>
      </div>

      {/* Target Crop & Annotated Physics Measurements */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Left: Annotated ROI Crop Image */}
        <div className="md:col-span-5 bg-[#242424] border border-white/08 rounded-[2px] p-3 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-[12px] font-mono font-bold text-slate-400 mb-1.5 uppercase">
            <span>ROI CROP</span>
            <span className="text-[#c98a4b]">{Math.round(detection.bbox.width || 0)}×{Math.round(detection.bbox.height || 0)}px</span>
          </div>

          {/* Annotated ROI Image with Measurement Brackets */}
          <div className="relative w-full flex items-center justify-center bg-black rounded-[2px] border border-white/10 p-1.5 overflow-hidden">
            {crop_image_url ? (
              <div className="relative inline-block">
                <img
                  src={crop_image_url}
                  alt="Target Signature"
                  className="max-h-28 object-contain rounded-[1px] bg-black"
                />

                {/* Highlight Peak Bracket Overlay */}
                <div className="absolute top-1 left-1 border-t-2 border-l-2 border-[#c98a4b] px-1.5 py-0.5 bg-black/90 text-[10px] font-mono text-[#c98a4b] font-bold">
                  HL Peak: {physics_details.highlight_mean_intensity}
                </div>

                {/* Shadow Base Bracket Overlay */}
                <div className="absolute bottom-1 right-1 border-b-2 border-r-2 border-[#7e8d9f] border-dashed px-1.5 py-0.5 bg-black/90 text-[10px] font-mono text-slate-300 font-bold">
                  Shadow Base: {physics_details.shadow_mean_intensity}
                </div>

                {/* Contrast Vector Badge */}
                <div className="absolute top-1 right-1 bg-[#141414] border border-white/15 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono text-slate-200 font-bold">
                  Δ {physics_details.contrast_ratio}x
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-[2px] bg-black flex items-center justify-center text-slate-600 text-xs font-mono">
                ROI
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-between text-[11.5px] font-mono text-slate-400 mt-2 pt-1.5 border-t border-white/06">
            <span>Shadow: <strong className="text-slate-200">{physics_details.shadow_length_px}px</strong></span>
            <span>Class: <strong className="uppercase" style={{ color: targetColor.hex }}>{class_name}</strong></span>
          </div>
        </div>

        {/* Right: Confidence Breakdown & Fusion Formula */}
        <div className="md:col-span-7 bg-[#242424] border border-white/08 rounded-[2px] p-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* AI Confidence Bar */}
            <div>
              <div className="flex items-center justify-between text-[13.5px] font-mono mb-1">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <Activity className="w-4 h-4 text-[#c98a4b]" />
                  YOLOv8 Model Confidence:
                </span>
                <span className="font-extrabold text-[#c98a4b]">{Math.round(model_confidence * 100)}%</span>
              </div>
              <div className="w-full bg-[#141414] rounded-[2px] h-2.5 overflow-hidden border border-white/10">
                <div
                  className="bg-[#c98a4b] h-full rounded-[1px] transition-all duration-300"
                  style={{ width: `${Math.round(model_confidence * 100)}%` }}
                />
              </div>
            </div>

            {/* Acoustic Physics Bar */}
            <div>
              <div className="flex items-center justify-between text-[13.5px] font-mono mb-1">
                <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#4b7bc9]" />
                  Acoustic Physics Score:
                </span>
                <span className="font-extrabold text-[#4b7bc9]">{Math.round(acoustic_score * 100)}%</span>
              </div>
              <div className="w-full bg-[#141414] rounded-[2px] h-2.5 overflow-hidden border border-white/10">
                <div
                  className="bg-[#4b7bc9] h-full rounded-[1px] transition-all duration-300"
                  style={{ width: `${Math.round(acoustic_score * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-white/08 flex items-center justify-between text-[12.5px] font-mono">
            <span className="text-slate-400">Score Fusion:</span>
            <span className="text-slate-200 font-bold bg-[#141414] px-2.5 py-0.5 rounded-[2px] border border-white/10">
              0.65×(AI) + 0.35×(Physics) = <span className="text-[#c98a4b] font-extrabold">{final_score}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Physics Validation Details Box */}
      <div className="bg-[#242424] border border-white/08 rounded-[2px] p-3.5">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/06">
          <span className="text-[14px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4b7bc9]" />
            Physics-Informed Acoustic Filter
          </span>
          <div className={`flex items-center gap-1 text-[12px] font-mono font-bold px-2.5 py-0.5 rounded-[2px] border ${
            shadow_detected 
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
              : 'bg-red-950/40 text-red-300 border-red-500/30'
          }`}>
            {shadow_detected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>{shadow_detected ? 'SHADOW CONFIRMED' : 'NO SHADOW'}</span>
          </div>
        </div>

        <p className="text-[13px] font-mono text-slate-300 italic bg-[#141414] p-2 rounded-[2px] border border-white/06 leading-relaxed">
          "{physics_details.heuristic_notes}"
        </p>
      </div>

      {/* Geolocation Coordinates */}
      <div className="bg-[#242424] border border-white/08 rounded-[2px] p-3.5">
        <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/06">
          <span className="text-[14px] font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#c98a4b]" />
            WGS84 Coordinates & Sonar Ranges
          </span>
          <span className="text-[12px] font-mono text-slate-300 bg-[#141414] px-2.5 py-0.5 rounded-[2px] border border-white/10">
            {geo_details.estimation_method}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[13px] font-mono">
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/08">
            <span className="text-[11px] text-slate-400 block mb-0.5">WGS84 Latitude</span>
            <span className="font-bold text-white">{latitude.toFixed(6)}° N</span>
          </div>
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/08">
            <span className="text-[11px] text-slate-400 block mb-0.5">WGS84 Longitude</span>
            <span className="font-bold text-white">{longitude.toFixed(6)}° E</span>
          </div>
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/08">
            <span className="text-[11px] text-slate-400 block mb-0.5">Cross-Track</span>
            <span className="font-bold text-[#c98a4b]">
              {geo_details.cross_track_m > 0 ? `+${geo_details.cross_track_m}m Stbd` : `${geo_details.cross_track_m}m Port`}
            </span>
          </div>
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/08">
            <span className="text-[11px] text-slate-400 block mb-0.5">Slant Range</span>
            <span className="font-bold text-slate-200">{geo_details.slant_range_m} m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
