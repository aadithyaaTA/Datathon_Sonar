import React, { useState, useRef } from 'react';
import { 
  Eye, Layers, ZoomIn, ZoomOut, Sliders, Scan, Crosshair, Palette 
} from 'lucide-react';
import { CLASS_COLORS, getClassColor } from '../services/colors';

export default function SonarViewer({
  analysisResult,
  selectedDetection,
  onSelectDetection,
  isAnalyzing
}) {
  const [viewMode, setViewMode] = useState('annotated'); // 'annotated' | 'preprocessed' | 'original'
  const [colorPalette, setColorPalette] = useState('standard'); // 'standard' | 'copper' | 'marine' | 'thermal'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, rangeM: 0, alongM: 0 });
  const containerRef = useRef(null);

  const swathM = analysisResult?.navigation?.swath_width_m || 100;
  const halfSwath = Math.round(swathM / 2);
  const totalAlongM = 60; // Standard 60m along-track waterfall window

  const handleMouseMove = (e) => {
    if (!containerRef.current || !analysisResult) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    
    const scaleX = analysisResult.image_width / rect.width;
    const scaleY = analysisResult.image_height / rect.height;
    
    const pxX = Math.round(x * scaleX);
    const pxY = Math.round(y * scaleY);
    
    const rangeM = ((pxX - analysisResult.image_width / 2) / (analysisResult.image_width / 2)) * halfSwath;
    const alongM = (pxY / analysisResult.image_height) * totalAlongM;
    
    setCursorPos({ 
      x: pxX, 
      y: pxY, 
      rangeM: Number(rangeM.toFixed(1)),
      alongM: Number(alongM.toFixed(1))
    });
  };

  const getPaletteFilter = () => {
    switch (colorPalette) {
      case 'copper':
        return 'sepia(0.85) saturate(2.4) hue-rotate(335deg) brightness(1.05)';
      case 'marine':
        return 'sepia(0.5) saturate(2.2) hue-rotate(175deg) brightness(1.05)';
      case 'thermal':
        return 'invert(1) contrast(1.25)';
      default:
        return 'none';
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-8 flex flex-col items-center justify-center min-h-[440px] text-center">
        <div className="w-16 h-16 rounded-[2px] bg-[#141414] border border-white/10 flex items-center justify-center mb-4 text-[#c98a4b] animate-spin">
          <Scan className="w-8 h-8" />
        </div>

        <h3 className="text-[18px] font-mono font-bold text-white tracking-wider uppercase mb-1.5">
          PROCESSING HIGH-RESOLUTION SONAR SWATH
        </h3>
        <p className="text-[14px] font-mono text-slate-400 text-center max-w-md">
          Bilateral Despeckling • CLAHE Contrast Equalization • YOLOv8 Scan • Acoustic Occlusion Analysis
        </p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-8 flex flex-col items-center justify-center min-h-[440px] text-center">
        <div className="w-16 h-16 rounded-[2px] bg-[#141414] border border-white/10 flex items-center justify-center text-slate-400 mb-3.5">
          <Layers className="w-8 h-8 text-[#c98a4b]" />
        </div>
        <h3 className="text-[18px] font-mono font-bold text-slate-200 uppercase tracking-wider mb-2">
          ACOUSTIC SWATH VIEWPORT STANDBY
        </h3>
        <p className="text-[14px] font-mono text-slate-400 max-w-lg mb-4 leading-relaxed">
          Upload a raw side-scan sonar record or select a calibrated MoES survey preset from the top banner to inspect automated detections.
        </p>
        <span className="text-[12.5px] font-mono px-3 py-1 rounded-[2px] bg-[#141414] text-slate-300 border border-white/10">
          Awaiting Sensor Ingestion
        </span>
      </div>
    );
  }

  const currentImage =
    viewMode === 'annotated'
      ? analysisResult.annotated_image_url
      : viewMode === 'preprocessed'
      ? analysisResult.preprocessed_image_url
      : analysisResult.original_image_url;

  // Depth / along-track waterfall ticks every 15 meters
  const depthTicks = [0, 15, 30, 45, 60];

  return (
    <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] overflow-hidden flex flex-col">
      {/* Top Bar: Visibly larger header */}
      <div className="p-3 bg-[#141414] border-b border-white/08 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[18px] font-mono font-bold text-white tracking-wide">
            ACOUSTIC SWATH INSPECTOR
          </span>
          <span className="text-[12px] font-mono px-2 py-0.5 rounded-[2px] bg-[#1f1f1f] text-slate-300 border border-white/10">
            {analysisResult.image_width} × {analysisResult.image_height} PX
          </span>
          <span className="text-[12px] font-mono px-2 py-0.5 rounded-[2px] bg-[#1f1f1f] text-[#c98a4b] border border-white/10">
            {analysisResult.processing_time_ms} ms
          </span>
        </div>

        {/* Colormap Switcher */}
        <div className="flex items-center gap-1 bg-[#1f1f1f] p-0.5 rounded-[2px] border border-white/08 text-[12px] font-mono">
          <Palette className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <button
            onClick={() => setColorPalette('standard')}
            className={`px-2.5 py-0.5 rounded-[2px] transition-colors cursor-pointer ${
              colorPalette === 'standard' ? 'bg-[#c98a4b] text-[#080d16] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Gray
          </button>
          <button
            onClick={() => setColorPalette('copper')}
            className={`px-2.5 py-0.5 rounded-[2px] transition-colors cursor-pointer ${
              colorPalette === 'copper' ? 'bg-[#c98a4b] text-[#080d16] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Copper
          </button>
          <button
            onClick={() => setColorPalette('marine')}
            className={`px-2.5 py-0.5 rounded-[2px] transition-colors cursor-pointer ${
              colorPalette === 'marine' ? 'bg-[#c98a4b] text-[#080d16] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Marine
          </button>
          <button
            onClick={() => setColorPalette('thermal')}
            className={`px-2.5 py-0.5 rounded-[2px] transition-colors cursor-pointer ${
              colorPalette === 'thermal' ? 'bg-[#c98a4b] text-[#080d16] font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Invert
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center bg-[#1f1f1f] p-0.5 rounded-[2px] border border-white/08 text-[12.5px] font-mono">
          <button
            onClick={() => setViewMode('annotated')}
            className={`px-3 py-1 rounded-[2px] transition-colors cursor-pointer ${
              viewMode === 'annotated'
                ? 'bg-[#c98a4b] text-[#080d16] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Annotations
          </button>
          <button
            onClick={() => setViewMode('preprocessed')}
            className={`px-3 py-1 rounded-[2px] transition-colors cursor-pointer ${
              viewMode === 'preprocessed'
                ? 'bg-[#c98a4b] text-[#080d16] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CLAHE Enhanced
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 rounded-[2px] transition-colors cursor-pointer ${
              viewMode === 'original'
                ? 'bg-[#c98a4b] text-[#080d16] font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Raw Matrix
          </button>
        </div>
      </div>

      {/* Main Interactive Stage with Vertical Depth/Range Waterfall Ruler */}
      <div className="relative bg-black flex min-h-[400px] select-none overflow-hidden group">
        {/* Real Vertical Range / Depth Ruler Along Left Edge (Ticks every 15m) */}
        <div className="w-13 bg-[#141414] border-r border-white/08 flex flex-col justify-between py-6 px-1.5 text-[11px] font-mono text-slate-400 z-20 select-none">
          {depthTicks.map((tick, idx) => (
            <div key={idx} className="flex items-center justify-between relative">
              <span className="text-[#c98a4b] font-bold">{tick}m</span>
              <div className="w-2.5 h-[1px] bg-white/20"></div>
              {/* Minor subtick */}
              {idx < depthTicks.length - 1 && (
                <div className="absolute top-[50%] right-0 w-1.5 h-[1px] bg-white/10"></div>
              )}
            </div>
          ))}
        </div>

        {/* Viewport Canvas Container */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className="flex-1 relative flex items-center justify-center p-2 cursor-crosshair overflow-hidden"
        >
          {/* Top Lateral Scale Ruler (Port / Nadir / Starboard) */}
          <div className="absolute top-2 left-3 right-3 z-20 flex items-center justify-between pointer-events-none text-[12px] font-mono">
            <span className="px-2.5 py-0.5 rounded-[2px] bg-[#141414]/90 border border-white/10 text-slate-300">
              PORT (-{halfSwath}m)
            </span>
            <span className="px-3 py-0.5 rounded-[2px] bg-[#242424] border border-[#c98a4b]/40 text-[#c98a4b] font-bold">
              NADIR (0.0m TRACK)
            </span>
            <span className="px-2.5 py-0.5 rounded-[2px] bg-[#141414]/90 border border-white/10 text-slate-300">
              STARBOARD (+{halfSwath}m)
            </span>
          </div>

          {/* Live Hover Readout */}
          <div className="absolute bottom-2 left-3 z-20 pointer-events-none flex items-center gap-3 text-[12px] font-mono bg-[#141414]/90 border border-white/10 px-2.5 py-1 rounded-[2px] text-slate-300">
            <span>X: <strong className="text-white">{cursorPos.x}px</strong></span>
            <span>Y: <strong className="text-white">{cursorPos.y}px</strong></span>
            <span>Cross-Track: <strong className="text-[#c98a4b]">{cursorPos.rangeM > 0 ? `+${cursorPos.rangeM}m Stbd` : `${cursorPos.rangeM}m Port`}</strong></span>
            <span>Along-Track: <strong className="text-slate-200">{cursorPos.alongM}m</strong></span>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-2 right-3 z-20 flex items-center gap-1.5 bg-[#141414]/90 border border-white/10 p-1 rounded-[2px]">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1 rounded-[2px] hover:bg-[#242424] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1 rounded-[2px] hover:bg-[#242424] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded-[2px] hover:bg-[#242424] text-slate-300 hover:text-white transition-colors text-[12px] font-mono font-bold cursor-pointer"
              title="Reset Zoom"
            >
              1x
            </button>
          </div>

          {/* Rendered Sonar Image */}
          <div 
            className="transition-transform duration-150 ease-out w-full flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={currentImage}
              alt="Sonar Acoustic Sweep"
              style={{ filter: getPaletteFilter() }}
              className="max-h-[490px] w-full object-contain rounded-[2px] border border-white/10"
            />
          </div>
        </div>
      </div>

      {/* Target Fast-Selector Tray */}
      {analysisResult.detections?.length > 0 && (
        <div className="p-3 bg-[#141414] border-t border-white/08 flex items-center gap-2.5 overflow-x-auto">
          <span className="text-[12px] font-mono text-slate-400 font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-[#c98a4b]" />
            TARGETS ({analysisResult.detections.length}):
          </span>
          {analysisResult.detections.map((det) => {
            const isSelected = selectedDetection?.id === det.id;
            const cColor = getClassColor(det.class_name);
            return (
              <button
                key={det.id}
                onClick={() => onSelectDetection(det)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-[13px] font-mono border transition-colors flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#242424] text-white font-bold'
                    : 'bg-[#181818] border-white/08 text-slate-300 hover:border-white/20'
                }`}
                style={{
                  borderColor: isSelected ? cColor.hex : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-[1px]"
                  style={{ backgroundColor: cColor.hex }}
                />
                <span>{det.class_name.replace('_', ' ')}</span>
                <span className="text-[12px] text-slate-400">
                  {Math.round(det.final_score * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
