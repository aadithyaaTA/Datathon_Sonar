import React from 'react';
import { X, Download, FileJson, FileSpreadsheet, Globe, Shield, CheckCircle2 } from 'lucide-react';
import { getReportDownloadUrl } from '../services/api';
import { getClassColor } from '../services/colors';

export default function ReportModal({ isOpen, onClose, analysisResult }) {
  if (!isOpen || !analysisResult) return null;

  const {
    mission_id, timestamp, mode, model_name,
    navigation, detections, summary, processing_time_ms
  } = analysisResult;

  const jsonUrl = getReportDownloadUrl(mission_id, 'json');
  const csvUrl = getReportDownloadUrl(mission_id, 'csv');
  const geojsonUrl = getReportDownloadUrl(mission_id, 'geojson');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#1c1c1c] border border-white/15 rounded-[2px] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#141414] border-b border-white/08 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#242424] border border-white/10 text-[#c98a4b]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-mono font-bold text-white tracking-wide">
                SONARSENTINEL HYDROGRAPHIC MISSION REPORT
              </h2>
              <p className="text-[13px] font-mono text-slate-400">
                Mission Ref: <span className="text-[#c98a4b] font-bold">{mission_id}</span> • {timestamp}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[2px] text-slate-400 hover:text-white hover:bg-[#242424] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-[13px]">
          {/* Mission Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141414] p-3.5 rounded-[2px] border border-white/08">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">PIPELINE ARCHITECTURE</span>
              <span className="font-bold text-slate-200">{mode} ({model_name})</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">VESSEL GPS ORIGIN</span>
              <span className="font-bold text-white">{navigation.vessel_lat}°N, {navigation.vessel_lon}°E</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">HEADING & ALTITUDE</span>
              <span className="font-bold text-white">{navigation.heading}° True / {navigation.altitude}m Alt</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">PROCESSING DURATION</span>
              <span className="font-bold text-emerald-400">{processing_time_ms} ms</span>
            </div>
          </div>

          {/* Detections Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-bold text-slate-200 uppercase tracking-wider">
                Classified Underwater Obstacles ({detections.length})
              </h3>
              <span className="text-[12px] text-slate-400">
                Sorted by Hazard Severity
              </span>
            </div>

            <div className="overflow-x-auto border border-white/08 rounded-[2px] bg-[#141414]">
              <table className="w-full text-left text-[12.5px] border-collapse">
                <thead className="bg-[#0f0f0f] text-slate-400 border-b border-white/08 text-[11.5px]">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Target Class</th>
                    <th className="p-3">Hazard Level</th>
                    <th className="p-3">YOLO Conf.</th>
                    <th className="p-3">Physics Score</th>
                    <th className="p-3">Final Score</th>
                    <th className="p-3">Shadow Verified</th>
                    <th className="p-3">Estimated WGS84</th>
                    <th className="p-3">Slant Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/05 text-slate-300">
                  {detections.map((det) => {
                    const cColor = getClassColor(det.class_name);
                    return (
                      <tr key={det.id} className="hover:bg-[#202020] transition-colors">
                        <td className="p-3 font-bold text-white">{det.id}</td>
                        <td className="p-3 uppercase font-medium text-white flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-[1px]"
                            style={{ backgroundColor: cColor.hex }}
                          />
                          <span>{det.class_name.replace('_', ' ')}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className="px-2.5 py-0.5 rounded-[2px] text-[11px] font-bold border"
                            style={{
                              backgroundColor: `${cColor.hex}15`,
                              color: cColor.hex,
                              borderColor: `${cColor.hex}40`,
                            }}
                          >
                            {det.hazard_level}
                          </span>
                        </td>
                        <td className="p-3">{Math.round(det.model_confidence * 100)}%</td>
                        <td className="p-3">{Math.round(det.acoustic_score * 100)}%</td>
                        <td className="p-3 font-bold text-white">{Math.round(det.final_score * 100)}%</td>
                        <td className="p-3">
                          {det.shadow_detected ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> CONFIRMED
                            </span>
                          ) : (
                            <span className="text-slate-500">NO</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300">{det.latitude.toFixed(5)}°N, {det.longitude.toFixed(5)}°E</td>
                        <td className="p-3">{det.geo_details.slant_range_m}m</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer & Export Buttons */}
        <div className="p-4 bg-[#141414] border-t border-white/08 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[12px] font-mono text-slate-400">
            Export formats for Hydrographic Survey & GIS Archival:
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={jsonUrl}
              download={`SonarSentinel_${mission_id}.json`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[2px] bg-[#242424] hover:bg-[#2e2e2e] border border-white/10 text-slate-200 hover:text-white font-mono text-[13px] font-bold transition-colors"
            >
              <FileJson className="w-4 h-4 text-[#c98a4b]" />
              JSON
            </a>

            <a
              href={csvUrl}
              download={`SonarSentinel_${mission_id}.csv`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[2px] bg-[#242424] hover:bg-[#2e2e2e] border border-white/10 text-slate-200 hover:text-white font-mono text-[13px] font-bold transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              CSV (Excel)
            </a>

            <a
              href={geojsonUrl}
              download={`SonarSentinel_${mission_id}.geojson`}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[2px] bg-[#242424] hover:bg-[#2e2e2e] border border-white/10 text-slate-200 hover:text-white font-mono text-[13px] font-bold transition-colors"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              GIS GeoJSON
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
