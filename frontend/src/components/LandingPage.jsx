import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Shield, Cpu, Activity, MapPin, 
  Layers, Waves, FileText, ArrowRight, 
  CheckCircle2, ChevronRight, Terminal, Compass, Zap,
  Radio, Sliders, Disc, HardDrive, RefreshCw, X, AlertTriangle,
  Settings, Power, Crosshair, Volume2, Database, Eye, Gauge, Lock
} from 'lucide-react';
import { soundFx } from '../services/sound';

// Helper component for physical hex screw heads on metal plates
function HexScrew({ className = '' }) {
  return <div className={`hex-screw ${className}`} title="Tactile Hex Screw Anchor" />;
}

// Helper component for recessed status LEDs
function LedLight({ state = 'off', label = '' }) {
  const ledClass = 
    state === 'orange' ? 'led-orange-on' : 
    state === 'amber' ? 'led-amber-on' : 
    'led-off';
  return (
    <div className="flex items-center gap-2">
      <span className={`led-indicator ${ledClass}`} />
      {label && <span className="text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase">{label}</span>}
    </div>
  );
}

export default function LandingPage({ onLaunchDashboard, presets = [], onSelectPresetAndLaunch }) {
  // Console state management
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [fileProgress, setFileProgress] = useState(0);
  const [isCassetteLoading, setIsCassetteLoading] = useState(false);
  
  // Interactive Rack States
  const [filterKnobAngle, setFilterKnobAngle] = useState(45);
  const [segmentationModel, setSegmentationModel] = useState('yolov8'); // 'yolov8' | 'unet'
  const [isLogPaused, setIsLogPaused] = useState(false);
  
  // Wipe Slider Lever (0 to 100%)
  const [wipePosition, setWipePosition] = useState(50);
  const isDraggingWipe = useRef(false);

  // Terminal log items
  const [terminalLogs, setTerminalLogs] = useState([
    '[SYS_INIT] 1990s Acoustic Terminal v4.2 Online...',
    '[NMEA_BUS] Lat: 13.0827°N Lon: 80.2707°E Alt: 18.2m Heading: 085.4°',
    '[SONAR_INGEST] Side-Scan Stream Active (500kHz High Frequency)',
    '[FILTER_DSP] CLAHE Normalization Active • ClipLimit=2.5',
    '[DETECTOR_CORE] YOLOv8-seg Proposed Candidate Region #01',
    '[PHYSICS_SHADOW] Highlight intensity: 192 | Shadow Base: 14 | Δ: 13.7x',
    '[GEO_TAG] WGS84 Geolocation Verified: Object #104 [GHOST_NET]',
  ]);

  // Handle auto-scrolling terminal logs unless paused
  useEffect(() => {
    if (isLogPaused) return;
    const interval = setInterval(() => {
      const timestamp = new Date().toISOString().substring(11, 19);
      const sampleMessages = [
        `[${timestamp}] [DSP_PING] Swath Sweep +48.2m Stbd • SNR: 24.1dB`,
        `[${timestamp}] [DEBRIS_SCAN] Candidate ROI Detected • Confidence 89%`,
        `[${timestamp}] [SHADOW_PROJECT] Raytrace Verified Base Depth: 1.8m`,
        `[${timestamp}] [NMEA_UPDATE] Hydrographic Towfish Speed: 3.2 knots`,
        `[${timestamp}] [CLASSIFIER] Target match: DISCARDED_CYLINDER_DRUM`,
      ];
      const randomMsg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      setTerminalLogs(prev => [...prev.slice(-12), randomMsg]);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLogPaused]);

  // Handle cassette deck loading simulation
  const triggerFloppyLoad = () => {
    soundFx.playClick();
    setIsFileModalOpen(true);
    setIsCassetteLoading(true);
    setFileProgress(0);

    let current = 0;
    const timer = setInterval(() => {
      current += 10;
      setFileProgress(current);
      soundFx.playBeep();
      if (current >= 100) {
        clearInterval(timer);
        setIsCassetteLoading(false);
      }
    }, 220);
  };

  // Knob interaction
  const rotateFilterKnob = () => {
    soundFx.playClick();
    setFilterKnobAngle(prev => (prev + 45) % 360);
  };

  // Model Toggle
  const toggleModel = () => {
    soundFx.playToggle();
    setSegmentationModel(prev => (prev === 'yolov8' ? 'unet' : 'yolov8'));
  };

  return (
    <div className="min-h-screen bg-[#14171d] text-[#E2E8F0] font-mono selection:bg-[#FF6600] selection:text-[#0A0C0F] p-3 md:p-6 space-y-6">
      
      {/* ===================================================================
          1. HEADER & CONTROL PANEL BAR
          =================================================================== */}
      <header className="skeuo-chassis p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Top Left: Stenciled Industrial Label */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="skeuo-inset px-3 py-1.5 flex items-center gap-2 border border-[#3A4150]">
            <Radio className="w-4 h-4 text-[#FF6600] animate-pulse" />
            <span className="text-[13px] font-black tracking-widest text-[#E2E8F0]">
              SYSTEM LOG: SIH-26057 // MoES
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            [TACTICAL HYDROGRAPHIC SUBMARINE CONSOLE]
          </span>
        </div>

        {/* Center: Recessed LED Status Lights */}
        <div className="skeuo-inset px-4 py-2 flex items-center gap-6 border border-[#2D323E]">
          <LedLight state="orange" label="POWER" />
          <div className="h-4 w-[1px] bg-[#2A2F3B]" />
          <LedLight state="amber" label="ACOUSTIC STREAM READY" />
          <div className="h-4 w-[1px] bg-[#2A2F3B]" />
          <LedLight state="off" label="ERROR" />
        </div>

        {/* Top Right: Diagnostics Switch & Console Launch */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              soundFx.playToggle();
              setIsDiagnosticsOpen(!isDiagnosticsOpen);
            }}
            className="skeuo-btn text-[11px] px-3 py-1.5 uppercase flex items-center gap-2"
            title="Toggle Mechanical Diagnostics Panel"
          >
            <Settings className={`w-3.5 h-3.5 ${isDiagnosticsOpen ? 'text-[#FF6600] rotate-45' : 'text-slate-400'} transition-transform`} />
            <span>SYS DIAGNOSTICS</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              onLaunchDashboard();
            }}
            className="skeuo-btn-orange text-[12px] px-4 py-2 uppercase flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>ENTER LIVE CONSOLE</span>
          </button>
        </div>
      </header>

      {/* DIAGNOSTICS EXTENDED DRAWER */}
      {isDiagnosticsOpen && (
        <div className="skeuo-panel p-4 border-2 border-[#FF6600] animate-fadeIn space-y-3">
          <div className="flex items-center justify-between border-b border-[#3A4150] pb-2">
            <span className="text-[#FF6600] font-extrabold text-[13px] tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              HARDWARE DIAGNOSTIC TELEMETRY BUS (SUB-20MS EDGE CORE)
            </span>
            <button onClick={() => setIsDiagnosticsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="skeuo-inset p-2.5 space-y-1">
              <span className="text-slate-400 block">ACOUSTIC SAMPLING RATE:</span>
              <span className="text-[#FF6600] font-extrabold text-[13px]">500 kHz SSS Waterfall</span>
            </div>
            <div className="skeuo-inset p-2.5 space-y-1">
              <span className="text-slate-400 block">PIPELINE LATENCY:</span>
              <span className="text-amber-400 font-extrabold text-[13px]">17.4 ms (Zero-Cloud)</span>
            </div>
            <div className="skeuo-inset p-2.5 space-y-1">
              <span className="text-slate-400 block">WGS84 PRECISION:</span>
              <span className="text-emerald-400 font-extrabold text-[13px]">Sub-meter Swath Trigonometry</span>
            </div>
            <div className="skeuo-inset p-2.5 space-y-1">
              <span className="text-slate-400 block">PHYSICS VERIFICATION:</span>
              <span className="text-[#FF6600] font-extrabold text-[13px]">Rayleigh Shadow Ray Tracer</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          2. HERO SECTION & CRT SONAR SCOPE
          =================================================================== */}
      <section className="skeuo-chassis p-5 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
        
        {/* Left Column: Monospace Stencil Headline & Tactile Buttons */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          <div className="inline-flex items-center gap-2 skeuo-plaque px-3 py-1 text-[11px] font-extrabold">
            <Shield className="w-3.5 h-3.5 text-[#FF6600]" />
            <span>MoES PROBLEM STATEMENT SIH-26057</span>
          </div>

          {/* Heavy Stencil Monospace Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none uppercase">
            AUTOMATED ACOUSTIC <br />
            <span className="orange-crt-glow text-[#FF6600]">DEBRIS DETECTION</span> <br />
            CONSOLE
          </h1>

          {/* 2-Liner Solution */}
          <p className="text-[14px] md:text-[15px] font-mono text-slate-300 max-w-2xl leading-relaxed border-l-4 border-[#FF6600] pl-4 bg-[#181B22]/70 py-2">
            Processing noisy side-scan sonar feeds into real-time geospatial intelligence via low-level acoustic signal filtering and automated geo-tagging.
          </p>

          {/* Physical Controls Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => {
                soundFx.playClick();
                onLaunchDashboard();
              }}
              className="skeuo-btn-orange text-[13px] px-6 py-3.5 flex items-center gap-3 uppercase"
            >
              <Zap className="w-4 h-4 fill-current text-[#0A0C0F]" />
              <span>INITIATE SCANNER DEMO</span>
            </button>

            <button
              onClick={triggerFloppyLoad}
              className="skeuo-btn text-[12px] px-5 py-3 flex items-center gap-2 uppercase"
            >
              <HardDrive className="w-4 h-4 text-[#FF6600]" />
              <span>LOAD SAMPLE LOGS</span>
            </button>
          </div>

          {/* Metric Status Badges */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
            <span className="skeuo-inset px-2.5 py-1 border border-[#343A47]">
              CLASS: <strong className="text-white">GHOST NET, CYLINDER, WRECKAGE</strong>
            </span>
            <span className="skeuo-inset px-2.5 py-1 border border-[#343A47]">
              SPECKLE NOISE: <strong className="text-[#FF6600]">BILATERAL + CLAHE</strong>
            </span>
          </div>
        </div>

        {/* Right Column: 1990s CRT Monitor Frame with Revolving Sonar Scope */}
        <div className="lg:col-span-5 relative flex justify-center">
          <div className="crt-frame w-full max-w-md crt-scanlines p-3">
            
            {/* Monitor Header Readout */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#282C36] text-[10px] orange-crt-glow">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF6600] animate-ping" />
                RADAR SCOPE 500kHz SSS
              </span>
              <span>SWATH: 100m • NADIR</span>
            </div>

            {/* Revolving Radial Radar Scope */}
            <div className="crt-screen-orange aspect-square rounded-full border-4 border-[#282C36] relative flex items-center justify-center overflow-hidden my-2 shadow-inner">
              
              {/* Concentric Sonar Distance Rings */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#FF6600]/30" />
              <div className="absolute w-[55%] h-[55%] rounded-full border border-[#FF6600]/40" />
              <div className="absolute w-[30%] h-[30%] rounded-full border border-[#FF6600]/50" />
              
              {/* Crosshair Axes */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-[#FF6600]/30" />
                <div className="h-full w-[1px] bg-[#FF6600]/30" />
              </div>

              {/* Revolving Sweep Beam */}
              <div className="absolute inset-0 animate-sonar-sweep pointer-events-none">
                <div 
                  className="w-1/2 h-1/2 origin-bottom-right"
                  style={{
                    background: 'conic-gradient(from 0deg at 100% 100%, rgba(255,102,0,0.5) 0deg, rgba(255,102,0,0.1) 45deg, transparent 90deg)'
                  }}
                />
              </div>

              {/* Detected Anomaly Blips (Buoyant Orange Glow) */}
              <div className="absolute top-[32%] right-[28%] flex flex-col items-center">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF6600] animate-pulse shadow-[0_0_12px_#FF6600]" />
                <span className="text-[9px] bg-[#0A0C0F] text-[#FF6600] px-1 font-bold border border-[#FF6600] mt-0.5">
                  CYLINDER (89%)
                </span>
              </div>

              <div className="absolute bottom-[28%] left-[22%] flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[#FFB000] animate-pulse shadow-[0_0_10px_#FFB000]" />
                <span className="text-[9px] bg-[#0A0C0F] text-[#FFB000] px-1 font-bold border border-[#FFB000] mt-0.5">
                  GHOST NET (78%)
                </span>
              </div>

              {/* Center Vessel Marker */}
              <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#FFF] z-10" />
            </div>

            {/* Monitor Footer Readout */}
            <div className="flex items-center justify-between text-[10px] pt-1 text-slate-400">
              <span>LAT: 13°04'57"N LON: 80°16'14"E</span>
              <span className="text-[#FF6600] font-bold">PHYSICS SHADOW: OK</span>
            </div>
          </div>
        </div>

      </section>

      {/* ===================================================================
          3. PROBLEM STATEMENT SECTION (MoES SIH 26057)
          =================================================================== */}
      <section className="skeuo-chassis p-6 relative space-y-6">
        {/* Simulated Physical Hex Screws in 4 Corners */}
        <HexScrew className="absolute top-3 left-3" />
        <HexScrew className="absolute top-3 right-3" />
        <HexScrew className="absolute bottom-3 left-3" />
        <HexScrew className="absolute bottom-3 right-3" />

        {/* Section Header Plaque */}
        <div className="flex items-center justify-between border-b border-[#3A4150] pb-3 px-4">
          <div className="flex items-center gap-3">
            <div className="skeuo-plaque px-4 py-1.5 text-[14px] font-black tracking-widest text-[#FF6600]">
              TACTICAL CHALLENGE: MoES SIH 26057
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              [MINISTRY OF EARTH SCIENCES • SEABED DEBRIS MONITORS]
            </span>
          </div>
        </div>

        {/* 3 Tactile Cards with Heavy Inset Bevels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Speckle Noise Interference */}
          <div className="skeuo-panel p-5 space-y-3 relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#FF6600] font-bold text-[12px] uppercase">CHALLENGE 01</span>
                <LedLight state="orange" />
              </div>
              <h3 className="text-[15px] font-extrabold text-white">Speckle Noise Interference</h3>
              <p className="text-[12px] text-slate-300 leading-relaxed font-sans">
                Side-scan sonar image feeds are severely corrupted by Rayleigh acoustic speckle noise, masking submerged ghost nets and pipeline anomalies.
              </p>
            </div>

            {/* Oscilloscope Graphic Mockup */}
            <div className="skeuo-inset p-2.5 space-y-1">
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>RAW SPECKLE WAVEFORM</span>
                <span className="text-[#FF6600]">SNR: -8.4 dB</span>
              </div>
              <div className="h-14 w-full bg-[#080A0D] rounded border border-[#232834] flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full text-[#FF6600] opacity-80" viewBox="0 0 200 40">
                  <path d="M0,20 Q10,5 20,35 T40,10 T60,30 T80,2 T100,38 T120,8 T140,32 T160,12 T180,28 T200,20" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: Scan Area Overhead Dial */}
          <div className="skeuo-panel p-5 space-y-3 relative flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#FF6600] font-bold text-[12px] uppercase">CHALLENGE 02</span>
                <LedLight state="amber" />
              </div>
              <h3 className="text-[15px] font-extrabold text-white">Manual Bottleneck Delay</h3>
              <p className="text-[12px] text-slate-300 leading-relaxed font-sans">
                Human hydrographers require up to 4 hours per km² to manually annotate target imagery, leading to massive survey backlogs.
              </p>
            </div>

            {/* Analog Dial Indicator Mockup */}
            <div className="skeuo-inset p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 block">PROCESSING DELAY</span>
                <span className="text-[14px] font-black text-amber-400">3.5 HRS / KM²</span>
              </div>
              {/* Dial Gauge SVG */}
              <div className="w-12 h-12 rounded-full border-2 border-[#3E4554] bg-[#14171D] relative flex items-center justify-center">
                <div className="w-1 h-5 bg-[#FF6600] origin-bottom -rotate-45 rounded-full" />
                <div className="w-2 h-2 rounded-full bg-white z-10" />
              </div>
            </div>
          </div>

          {/* Card 3: Marine Ecosystem Hazard Plate */}
          <div className="skeuo-panel p-5 space-y-3 relative flex flex-col justify-between border-l-4 border-amber-500">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold text-[12px] uppercase">HAZARD IMPACT</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-[15px] font-extrabold text-white">Coastal Marine Hazards</h3>
              <p className="text-[12px] text-slate-300 leading-relaxed font-sans">
                Unmapped ghost fishing gear, abandoned containers, and underwater wreckage threaten marine life and navigation safety in Indian EEZ waters.
              </p>
            </div>

            <div className="skeuo-inset p-2.5 bg-amber-950/20 border border-amber-500/40 text-[10px] text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <span>HAZARD ALERT: INDIAN COASTAL SECTORS</span>
              </div>
              <div>Ghost Nets: ~640,000 Tons Annual Marine Entanglement</div>
            </div>
          </div>

        </div>
      </section>

      {/* ===================================================================
          4. TECHNICAL CAPABILITIES & BACKEND MODULES (3x2 Rack Units)
          =================================================================== */}
      <section className="skeuo-chassis p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#3A4150] pb-3">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-[#FF6600]" />
            <h2 className="text-[16px] font-black text-white uppercase tracking-wider">
              MODULAR BACKEND CAPABILITIES (3x2 HARDWARE RACK UNITS)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">[ANALOG KNOBS • DIGITAL SEGMENT READOUTS]</span>
        </div>

        {/* 3x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Rack 1: Signal Conditioning & Speckle Filter */}
          <div className="skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-[#FF6600]">RACK 01 // DSP</span>
              <LedLight state="orange" />
            </div>
            <h4 className="text-[13px] font-extrabold text-white">Signal Conditioning & Speckle Filter</h4>
            <p className="text-[11px] text-slate-300 font-sans">
              Bilateral despeckling algorithm preserves sharp object edges while CLAHE normalizes acoustic beam attenuation.
            </p>

            {/* Rotatable Analog Knob Interactive Widget */}
            <div className="skeuo-inset p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 block">CLAHE CLIP LIMIT</span>
                <span className="text-[13px] font-extrabold text-[#FF6600]">
                  {(2.0 + (filterKnobAngle / 360) * 2).toFixed(1)}x
                </span>
              </div>
              <button 
                onClick={rotateFilterKnob}
                className="w-12 h-12 rounded-full border-2 border-[#565E70] bg-gradient-to-b from-[#3A4150] to-[#1E222A] relative flex items-center justify-center cursor-pointer shadow-md hover:border-[#FF6600]"
                title="Click to adjust analog filter knob"
              >
                <div 
                  className="w-1 h-5 bg-[#FF6600] origin-bottom rounded-full transition-transform duration-200"
                  style={{ transform: `rotate(${filterKnobAngle}deg)` }}
                />
              </button>
            </div>
          </div>

          {/* Rack 2: Acoustic Segmentation Engine */}
          <div className="skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-[#FF6600]">RACK 02 // NEURAL</span>
              <LedLight state="orange" />
            </div>
            <h4 className="text-[13px] font-extrabold text-white">Acoustic Segmentation Engine</h4>
            <p className="text-[11px] text-slate-300 font-sans">
              Dual-path feature extractor proposing bounding polygons for 5 debris classes at sub-20ms speeds.
            </p>

            {/* Dual-Path Processing Toggle Switch */}
            <div className="skeuo-inset p-3 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">MODEL CORE:</span>
              <button
                onClick={toggleModel}
                className="skeuo-btn text-[11px] px-3 py-1.5 uppercase flex items-center gap-2"
              >
                <span className={segmentationModel === 'yolov8' ? 'text-[#FF6600] font-bold' : 'text-slate-400'}>YOLOv8-SEG</span>
                <span className="text-slate-600">/</span>
                <span className={segmentationModel === 'unet' ? 'text-[#FF6600] font-bold' : 'text-slate-400'}>U-NET</span>
              </button>
            </div>
          </div>

          {/* Rack 3: Sonar Nav Log Converter */}
          <div className="skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-amber-400">RACK 03 // NAV</span>
              <LedLight state="amber" />
            </div>
            <h4 className="text-[13px] font-extrabold text-white">Sonar Nav Log Converter</h4>
            <p className="text-[11px] text-slate-300 font-sans">
              Decodes NMEA vessel strings & towfish altitude into calibrated WGS84 target coordinates.
            </p>

            {/* 80s Style Digital 7-Segment Display */}
            <div className="led-segment-display text-center">
              13°04.962' N | 080°16.242' E
            </div>
          </div>

          {/* Rack 4: XTF/SDF Stream Demuxer */}
          <div className="skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-[#FF6600]">RACK 04 // I/O PORT</span>
              <LedLight state="orange" />
            </div>
            <h4 className="text-[13px] font-extrabold text-white">XTF / SDF Stream Demuxer</h4>
            <p className="text-[11px] text-slate-300 font-sans">
              Directly demuxes binary eXtended Triton Format (XTF) sonar waterfall packages.
            </p>

            {/* Hardware Port Interface Graphic */}
            <div className="skeuo-inset p-2.5 flex items-center justify-around text-[10px] text-slate-400">
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded-full border-2 border-slate-500 bg-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600]" />
                </div>
                <span>BNC-01 (500kHz)</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-5 h-5 rounded-full border-2 border-slate-500 bg-black flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
                <span>RS422 NMEA</span>
              </div>
            </div>
          </div>

          {/* Rack 5: Severity Heatmap Plotter */}
          <div className="skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-[#FF6600]">RACK 05 // DENSITY</span>
              <LedLight state="orange" />
            </div>
            <h4 className="text-[13px] font-extrabold text-white">Severity Heatmap Plotter</h4>
            <p className="text-[11px] text-slate-300 font-sans">
              Generates spatial hazard density matrices for coastal survey zone prioritization.
            </p>

            <div className="skeuo-inset p-2 grid grid-cols-6 gap-1 h-10">
              {Array.from({ length: 18 }).map((_, i) => (
                <div 
                  key={i} 
                  className="rounded-[1px]"
                  style={{
                    backgroundColor: i % 5 === 0 ? '#FF6600' : i % 3 === 0 ? '#FFB000' : '#1F2430'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Rack 6: AUV/ROV Embedded Core */}
          <div className="skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-[#FF6600]">RACK 06 // EDGE CORE</span>
              <LedLight state="orange" />
            </div>
            <h4 className="text-[13px] font-extrabold text-white">AUV / ROV Embedded Core</h4>
            <p className="text-[11px] text-slate-300 font-sans">
              Ruggedized low-wattage ONNX runtime engine designed for autonomous underwater vehicles.
            </p>

            <div className="skeuo-inset p-2 flex justify-between text-[10px]">
              <span className="text-slate-400">ENVELOPE: <strong className="text-white">15W TDP</strong></span>
              <span className="text-slate-400">LATENCY: <strong className="text-[#FF6600]">17ms</strong></span>
            </div>
          </div>

        </div>
      </section>

      {/* ===================================================================
          5. INTERACTIVE DEMO / SONAR TERMINAL SECTION
          =================================================================== */}
      <section className="skeuo-chassis p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#3A4150] pb-3">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[#FF6600]" />
            <h2 className="text-[16px] font-black text-white uppercase tracking-wider">
              INTERACTIVE DEMO // SONAR TERMINAL CONSOLE
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">[DUAL WIPE LEVER • LIVE MONITORING]</span>
        </div>

        {/* Dual-Screen Oscilloscope/Sonar View with Tactile Wipe Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-slate-300 font-bold uppercase">WIPE SLIDER LEVER:</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className={wipePosition < 40 ? 'text-[#FF6600] font-bold' : 'text-slate-400'}>
                [RAW ACOUSTIC FEED]
              </span>
              <span className="text-slate-600">◄ LEVER ►</span>
              <span className={wipePosition >= 40 ? 'text-[#FF6600] font-bold' : 'text-slate-400'}>
                [FILTERED BOUNDING BOXES]
              </span>
            </div>
          </div>

          {/* Skeuomorphic Slider Track */}
          <div className="skeuo-inset p-2 relative">
            <input
              type="range"
              min="0"
              max="100"
              value={wipePosition}
              onChange={(e) => {
                soundFx.playToggle();
                setWipePosition(Number(e.target.value));
              }}
              className="w-full accent-[#FF6600] cursor-pointer h-3 rounded"
            />
          </div>

          {/* Sonar Waterfall Frame with Interactive Wipe Divider */}
          <div className="crt-frame h-72 crt-scanlines relative overflow-hidden flex items-center justify-center">
            
            {/* Raw Side (Left Layer) */}
            <div className="absolute inset-0 bg-[#0B0803] flex items-center justify-center">
              <div className="w-full h-full opacity-60 bg-[radial-gradient(#FF6600_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="absolute top-4 left-4 bg-black/80 px-2 py-1 text-[10px] text-amber-400 border border-amber-500">
                RAW ACOUSTIC WATERFALL (HIGH NOISE)
              </div>
            </div>

            {/* Filtered Bounding Box Side (Right Layer clipped by wipePosition) */}
            <div 
              className="absolute inset-0 bg-[#070502] border-l-2 border-[#FF6600] transition-all"
              style={{ left: `${wipePosition}%` }}
            >
              <div className="absolute top-4 left-4 bg-[#FF6600] text-[#0A0C0F] px-2 py-1 text-[10px] font-black uppercase">
                FILTERED + YOLOV8 BOUNDING BOXES
              </div>

              {/* Target Bounding Box */}
              <div className="absolute top-1/3 left-1/4 w-40 h-24 border-2 border-[#FF6600] bg-[#FF6600]/20 flex flex-col justify-between p-1.5 shadow-[0_0_15px_rgba(255,102,0,0.4)]">
                <span className="text-[9px] bg-black text-[#FF6600] px-1 font-bold w-max border border-[#FF6600]">
                  GHOST_NET · 92% CONF
                </span>
                <span className="text-[8px] text-[#FF6600] font-mono">
                  HL: 184 | SHDW: 12 | Δ: 15.3x
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Live Sonar Terminal Log & Map Plotter Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Terminal Logs View (Buoyant Orange Text) */}
          <div className="lg:col-span-7 skeuo-inset p-4 font-mono text-[11px] space-y-2 crt-scanlines">
            <div className="flex items-center justify-between border-b border-[#252A34] pb-2">
              <span className="text-[#FF6600] font-bold uppercase flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                LIVE SONAR TERMINAL LOGS
              </span>
              <button
                onClick={() => {
                  soundFx.playClick();
                  setIsLogPaused(!isLogPaused);
                }}
                className="skeuo-btn text-[9px] px-2 py-0.5"
              >
                {isLogPaused ? 'RESUME FEED' : 'PAUSE FEED'}
              </button>
            </div>

            <div className="h-44 overflow-y-auto space-y-1 pr-2 orange-crt-glow font-mono">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="leading-snug">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Map Console Plotter */}
          <div className="lg:col-span-5 skeuo-panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#2D323E] pb-2">
              <span className="text-[11px] font-bold text-white uppercase flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#FF6600]" />
                MECHANICAL MAP CONSOLE
              </span>
              <span className="text-[9px] text-[#FF6600]">WGS84 GRID</span>
            </div>

            <div className="skeuo-inset h-44 p-3 relative flex items-center justify-center overflow-hidden">
              {/* Bathymetric Grid */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#FF6600_1px,transparent_1px),linear-gradient(to_bottom,#FF6600_1px,transparent_1px)] [background-size:20px_20px]" />
              
              {/* Target Pins */}
              <div className="absolute top-1/4 left-1/3 flex flex-col items-center">
                <MapPin className="w-5 h-5 text-[#FF6600] animate-bounce" />
                <span className="text-[8px] bg-black text-[#FF6600] px-1 border border-[#FF6600]">
                  NET-01
                </span>
              </div>

              <div className="absolute bottom-1/3 right-1/4 flex flex-col items-center">
                <MapPin className="w-5 h-5 text-amber-400 animate-pulse" />
                <span className="text-[8px] bg-black text-amber-400 px-1 border border-amber-400">
                  DRUM-02
                </span>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ===================================================================
          6. FLOPPY DISK / CASSETTE FILE LOADER MODAL
          =================================================================== */}
      {isFileModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="skeuo-chassis w-full max-w-lg p-6 space-y-4 border-2 border-[#FF6600]">
            
            <div className="flex items-center justify-between border-b border-[#3A4150] pb-2">
              <span className="text-[#FF6600] font-black text-[14px] flex items-center gap-2 uppercase">
                <HardDrive className="w-4 h-4" />
                FLOPPY DISK CASSETTE DECK LOADER
              </span>
              <button 
                onClick={() => setIsFileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[12px] text-slate-300">
                Insert 3.5" Floppy Diskette containing raw side-scan sonar XTF waterfall records.
              </p>

              {/* Progress Bar of Discrete Orange LED Blocks */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>INGESTION STATUS:</span>
                  <span className="text-[#FF6600] font-bold">{fileProgress}%</span>
                </div>
                <div className="skeuo-inset p-1.5 grid grid-cols-10 gap-1 h-8">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div 
                      key={idx}
                      className={`rounded-[1px] transition-all ${
                        (idx + 1) * 10 <= fileProgress 
                          ? 'bg-[#FF6600] shadow-[0_0_6px_#FF6600]' 
                          : 'bg-[#1C202A]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Quick Scenario Triggers */}
              {presets && presets.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] text-slate-400 font-bold block uppercase">
                    Select Standardized Survey Scenario:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          soundFx.playClick();
                          setIsFileModalOpen(false);
                          onSelectPresetAndLaunch(preset);
                        }}
                        className="skeuo-btn text-[11px] p-2 text-left justify-start flex flex-col"
                      >
                        <span className="text-white font-bold">{preset.name.split('—')[0]}</span>
                        <span className="text-[9px] text-[#FF6600]">{preset.target_type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsFileModalOpen(false)}
                className="skeuo-btn text-[11px] px-4 py-2"
              >
                CLOSE CASSETTE DECK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="skeuo-chassis p-4 text-center text-[11px] text-slate-400 space-y-1">
        <div>
          Ministry of Earth Sciences (MoES) • Smart India Hackathon SIH-26057 Track
        </div>
        <div className="text-[10px] text-slate-500">
          1990s Submarine Sonar Terminal & Tactical Equipment Console Architecture
        </div>
      </footer>

    </div>
  );
}
