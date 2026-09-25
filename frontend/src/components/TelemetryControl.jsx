import React from 'react';
import { 
  Upload, Navigation, Compass, Waves, Crosshair, 
  Play, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { playSonarPing } from '../services/audio';

export default function TelemetryControl({
  file,
  previewUrl,
  telemetry,
  isAnalyzing,
  onFileChange,
  onTelemetryChange,
  onAnalyze,
  onReset
}) {
  const handleInputChange = (field, value) => {
    onTelemetryChange({
      ...telemetry,
      [field]: value
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRunClick = () => {
    playSonarPing();
    onAnalyze();
  };

  return (
    <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-4 flex flex-col gap-4">
      {/* Top Header: Visibly larger and bolder */}
      <div className="flex items-center justify-between pb-3 border-b border-white/08">
        <div className="flex items-center gap-2 text-[18px] font-mono font-bold text-white tracking-wide">
          <div className="p-1.5 rounded-[2px] bg-[#141414] border border-white/10 text-[#c98a4b]">
            <Crosshair className="w-4 h-4" />
          </div>
          <span>MISSION TELEMETRY & INGESTION</span>
        </div>
        <button
          onClick={onReset}
          className="text-[12.5px] text-slate-400 hover:text-white flex items-center gap-1 font-mono transition-colors px-2.5 py-1 rounded-[2px] bg-[#141414] border border-white/10 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* File Ingestion Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-[2px] p-4 text-center transition-colors ${
          file || previewUrl
            ? 'border-[#c98a4b]/60 bg-[#242424]'
            : 'border-white/15 hover:border-white/30 bg-[#141414]'
        }`}
      >
        <input
          type="file"
          id="sonar-upload"
          accept="image/*,.png,.jpg,.jpeg,.tif,.tiff,.bmp"
          onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
          className="hidden"
        />

        {previewUrl ? (
          <div className="flex items-center gap-3.5">
            <img
              src={previewUrl}
              alt="Sonar Preview"
              className="w-18 h-18 object-cover rounded-[2px] border border-white/15 bg-black"
            />

            <div className="flex-1 text-left">
              <div className="flex items-center gap-1 text-emerald-400 text-[13px] font-mono font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sonar Record Ready</span>
              </div>
              <p className="text-[14px] font-mono font-bold text-slate-100 truncate max-w-[220px]">
                {file?.name || 'MoES Transect Acoustic Record'}
              </p>
              <p className="text-[12.5px] font-mono text-slate-400">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : '800 × 500 px Side-Scan Sonar'}
              </p>
              <label
                htmlFor="sonar-upload"
                className="mt-1.5 inline-block text-[13px] font-mono font-semibold text-[#c98a4b] hover:underline cursor-pointer"
              >
                Upload Different File
              </label>
            </div>
          </div>
        ) : (
          <label htmlFor="sonar-upload" className="cursor-pointer block py-3.5">
            <div className="w-10 h-10 rounded-[2px] bg-[#242424] border border-white/10 flex items-center justify-center mx-auto mb-2 text-[#c98a4b]">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-[14px] font-mono font-bold text-slate-200">
              Drag & Drop Sonar Imagery Here
            </p>
            <p className="text-[12.5px] font-mono text-slate-400 mt-1">
              Supports SSS GeoTIFF, PNG, JPG, or Matrix records
            </p>
          </label>
        )}
      </div>

      {/* Navigation Telemetry Parameters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[13px] font-mono font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-[#c98a4b]" />
            Vessel & Towfish Sensor Telemetry
          </span>
          <span className="text-[12px] text-slate-400 font-normal">WGS84 Datum</span>
        </div>

        {/* Lat & Lon */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/10 focus-within:border-[#c98a4b] transition-colors">
            <label className="text-[12.5px] font-mono text-slate-400 block mb-1">
              Vessel Latitude (°N)
            </label>
            <input
              type="number"
              step="0.0001"
              value={telemetry.vessel_lat}
              onChange={(e) => handleInputChange('vessel_lat', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-[14px] font-mono font-bold text-slate-100 focus:outline-none"
            />
          </div>

          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/10 focus-within:border-[#c98a4b] transition-colors">
            <label className="text-[12.5px] font-mono text-slate-400 block mb-1">
              Vessel Longitude (°E)
            </label>
            <input
              type="number"
              step="0.0001"
              value={telemetry.vessel_lon}
              onChange={(e) => handleInputChange('vessel_lon', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-[14px] font-mono font-bold text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Heading & Altitude */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/10 focus-within:border-[#c98a4b] transition-colors">
            <label className="text-[12.5px] font-mono text-slate-400 block mb-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              Compass Heading (0-360°)
            </label>
            <input
              type="number"
              min="0"
              max="360"
              value={telemetry.heading}
              onChange={(e) => handleInputChange('heading', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-[14px] font-mono font-bold text-slate-100 focus:outline-none"
            />
          </div>

          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/10 focus-within:border-[#c98a4b] transition-colors">
            <label className="text-[12.5px] font-mono text-slate-400 block mb-1 flex items-center gap-1">
              <Waves className="w-3.5 h-3.5 text-slate-400" />
              Towfish Altitude (m)
            </label>
            <input
              type="number"
              min="1"
              max="200"
              value={telemetry.altitude}
              onChange={(e) => handleInputChange('altitude', parseFloat(e.target.value) || 1)}
              className="w-full bg-transparent text-[14px] font-mono font-bold text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Swath Width & Mission Tag */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/10 focus-within:border-[#c98a4b] transition-colors">
            <label className="text-[12.5px] font-mono text-slate-400 block mb-1">
              Swath Width (m)
            </label>
            <input
              type="number"
              min="10"
              max="500"
              value={telemetry.swath_width_m}
              onChange={(e) => handleInputChange('swath_width_m', parseFloat(e.target.value) || 100)}
              className="w-full bg-transparent text-[14px] font-mono font-bold text-slate-100 focus:outline-none"
            />
          </div>

          <div className="bg-[#141414] p-2.5 rounded-[2px] border border-white/10 focus-within:border-[#c98a4b] transition-colors">
            <label className="text-[12.5px] font-mono text-slate-400 block mb-1">
              Survey Mission Tag
            </label>
            <input
              type="text"
              value={telemetry.mission_name}
              onChange={(e) => handleInputChange('mission_name', e.target.value)}
              className="w-full bg-transparent text-[14px] font-mono font-bold text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Execution Button (Flat, Sharp 2px Corners, Muted Copper) */}
      <button
        onClick={handleRunClick}
        disabled={isAnalyzing || (!file && !previewUrl)}
        className={`w-full py-3.5 px-4 rounded-[2px] font-mono font-bold text-[14px] tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
          isAnalyzing
            ? 'bg-[#242424] text-slate-400 cursor-not-allowed border-white/10'
            : !file && !previewUrl
            ? 'bg-[#181818] text-slate-500 cursor-not-allowed border-white/10'
            : 'bg-[#c98a4b] hover:bg-[#b87d40] text-[#080d16] border-[#96632f] active:scale-[0.99]'
        }`}
      >
        {isAnalyzing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
            <span>PROCESSING ACOUSTIC PIPELINE...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current text-[#080d16]" />
            <span>RUN SONAR ANALYSIS</span>
          </>
        )}
      </button>
    </div>
  );
}
