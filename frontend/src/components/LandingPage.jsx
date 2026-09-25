import React, { useState, useEffect } from 'react';
import { 
  Play, Shield, Cpu, Activity, MapPin, 
  Layers, Waves, FileText, ArrowRight, 
  CheckCircle2, ChevronRight, Terminal, Compass, Zap,
  ArrowDown, Radio
} from 'lucide-react';
import { CLASS_COLORS } from '../services/colors';
import { fetchSampleImageBlob } from '../services/api';

const PIPELINE_STAGES = [
  {
    id: 'ingestion',
    number: '01',
    name: 'Image & Telemetry Ingestion',
    shortName: 'INGESTION',
    tag: 'I/O & SENSOR BUS',
    summary: 'Ingests raw 8/16-bit GeoTIFF, PNG, JPG SSS records paired with real-time NMEA vessel telemetry.',
    technicalDetails: 'Accepts side-scan sonar waterfall lines and forward-looking matrices alongside WGS84 GPS latitude/longitude, gyro compass heading (0-360° True), towfish acoustic altitude, and calibrated swath range.',
    algorithm: 'NMEA-0183 & GeoTIFF Parser',
    module: 'backend/app/api/routes_analysis.py'
  },
  {
    id: 'preprocessing',
    number: '02',
    name: 'Bilateral Despeckling + CLAHE',
    shortName: 'PREPROCESSING',
    tag: 'SIGNAL CONDITIONING',
    summary: 'Non-linear bilateral filter removes Rayleigh acoustic speckle noise while preserving sharp object boundaries.',
    technicalDetails: 'Contrast Limited Adaptive Histogram Equalization (CLAHE) normalizes severe acoustic beam attenuation across lateral swath ranges, avoiding the boundary-blurring artifacts of standard Gaussian filters.',
    algorithm: 'Bilateral Filter (d=9, σ_color=75, σ_space=75) + CLAHE (clipLimit=2.5, grid=8x8)',
    module: 'backend/app/services/preprocessing.py'
  },
  {
    id: 'detector',
    number: '03',
    name: 'YOLOv8-Nano Feature Proposal',
    shortName: 'YOLOv8-NANO',
    tag: 'NEURAL INFERENCE',
    summary: 'Ultra-lightweight edge neural network proposes candidate regions of interest across 5 marine target classes.',
    technicalDetails: 'Detects ghost_net (entanglement hazards), cylinder (discarded drums), pipe (exposed seabed pipelines), wreckage (sunken hull obstacles), and unknown_anomaly. Runs at ~15ms inference latency for embedded AUV integration.',
    algorithm: 'YOLOv8-Nano (PyTorch / ONNX Engine with Acoustic Feature Extraction Fallback)',
    module: 'backend/app/services/detector.py'
  },
  {
    id: 'physics_filter',
    number: '04',
    name: 'Physics-Informed Acoustic Filter',
    shortName: 'PHYSICS FILTER',
    tag: 'HEURISTIC VERIFICATION',
    summary: 'Enforces look-direction shadow ray tracing to confirm physical 3D seabed elevation and eliminate false positives.',
    technicalDetails: 'Real underwater debris casts an acoustic shadow away from the towfish nadir track. The engine validates ensonified highlight intensity (μ_h > 140) and shadow base occlusion (μ_s < 45), computing contrast ratio Δ = μ_h / max(1, μ_s).',
    algorithm: 'Rayleigh Shadow Projection & Lateral Intensity Profiling',
    module: 'backend/app/services/acoustic_filter.py'
  },
  {
    id: 'fusion_scoring',
    number: '05',
    name: 'Multi-Factor Hazard Scoring',
    shortName: 'FUSION SCORING',
    tag: 'DECISION ENGINE',
    summary: 'Blends deep learning confidence with physics shadow confirmation into a unified hazard rating.',
    technicalDetails: 'Final Hazard Score = 0.65 × Confidence_YOLO + 0.35 × Score_Physics. Automatically categorizes detections into CRITICAL, HIGH, MEDIUM, and LOW operational hazard severity levels.',
    algorithm: 'Blended Heuristic-Neural Fusion: S_final = 0.65(S_ai) + 0.35(S_phy)',
    module: 'backend/app/services/acoustic_filter.py'
  },
  {
    id: 'geolocation',
    number: '06',
    name: 'WGS84 Geolocation Engine',
    shortName: 'WGS84 ENGINE',
    tag: 'GEOSPATIAL TRIGONOMETRY',
    summary: 'Converts pixel swath indices into precise geodetic WGS84 coordinates using altitude and heading matrices.',
    technicalDetails: 'Calculates cross-track ground range via Pythagoras slant-range compensation: y_g = sqrt(R_slant^2 - h_alt^2). Applies vessel heading rotation matrix to compute exact target Latitude and Longitude offsets in decimal degrees.',
    algorithm: 'WGS84 Great-Circle Trigonometry + 2D Rotation Matrix R(θ)',
    module: 'backend/app/services/geolocation.py'
  },
  {
    id: 'maritime_gis',
    number: '07',
    name: 'Maritime GIS & Swath Visualizer',
    shortName: 'MARITIME GIS',
    tag: 'OPERATOR CONSOLE',
    summary: 'Interactive waterfall display with lateral metric scale, 15m depth ruler, and nautical chart overlays.',
    technicalDetails: 'Provides real-time cross-track cursor inspection, multi-palette false-color rendering (Copper, Marine, Grayscale, Inverted), and CartoDB maritime GIS nautical charting.',
    algorithm: 'Leaflet Nautical Layer + Canvas Dynamic Hydrographic Waterfall',
    module: 'frontend/src/components/MaritimeMap.jsx & SonarViewer.jsx'
  },
  {
    id: 'dossier_export',
    number: '08',
    name: 'Mission Dossier Export',
    shortName: 'REPORT EXPORT',
    tag: 'ARCHIVAL & COMPLIANCE',
    summary: 'Exports complete hydrographic survey dossiers in JSON, CSV (Excel), and GIS GeoJSON formats.',
    technicalDetails: 'Generates standardized survey reports containing mission IDs, sensor parameters, classified target inventories, individual physics metrics, and georeferenced bounding boxes compliant with MoES/NIOT standards.',
    algorithm: 'RFC-7946 GeoJSON FeatureCollection & RFC-4180 CSV Serializer',
    module: 'backend/app/services/reporting.py'
  }
];

const EVALUATOR_STEPS = [
  {
    step: '01',
    title: 'Launch Live Operator Console',
    desc: 'Click "Launch Live Sonar Analysis" to initialize the hydrographic inspection dashboard and connect to the FastAPI backend telemetry bus.'
  },
  {
    step: '02',
    title: 'Select Standardized Survey Transect',
    desc: 'Choose one of 4 calibrated MoES benchmarks: Bay of Bengal (Ghost Net), Palk Strait (Wreckage), Arabian Sea (Pipeline), or Visakhapatnam (Cylinder).'
  },
  {
    step: '03',
    title: 'Execute Acoustic Analysis Pipeline',
    desc: 'Click "RUN SONAR ANALYSIS" to run the full Bilateral + CLAHE + YOLOv8 + Acoustic Shadow + Geolocation pipeline (~18ms latency).'
  },
  {
    step: '04',
    title: 'Inspect Physics Verification & ROI Crop',
    desc: 'Examine the annotated ROI thumbnail marking Highlight Peak and Shadow Base intensities along with the 0.65×(AI) + 0.35×(Physics) score fusion.'
  },
  {
    step: '05',
    title: 'Validate WGS84 Coordinates on GIS Map',
    desc: 'Review the vessel track and target pins on the interactive nautical chart to verify cross-track offset and slant-range calculations.'
  },
  {
    step: '06',
    title: 'Export Standardized Mission Dossier',
    desc: 'Click "EXPORT REPORT" in the top bar to inspect or download the survey results in structured JSON, CSV spreadsheet, or GIS GeoJSON.'
  }
];

const TICKER_ITEMS = [
  '5 DETECTION CLASSES',
  'SUB-20MS PIPELINE LATENCY',
  'WGS84 GEOREFERENCING',
  'PHYSICS-VERIFIED SHADOW ANALYSIS',
  'ZERO CLOUD DEPENDENCY',
  'BILATERAL SPECKLE FILTERING',
  'CLAHE BEAM NORMALIZATION',
  'MOES / NIOT COMPLIANT'
];

export default function LandingPage({ onLaunchDashboard, presets, onSelectPresetAndLaunch }) {
  const [selectedStage, setSelectedStage] = useState(PIPELINE_STAGES[0]);
  const [heroSonarUrl, setHeroSonarUrl] = useState('');

  useEffect(() => {
    // Attempt to load the realistic sample sonar image for the hero visual
    const loadHeroImage = async () => {
      try {
        const blob = await fetchSampleImageBlob('demo_cylinder.png');
        setHeroSonarUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.warn('Could not load sample sonar image, using procedural fallback:', err);
      }
    };
    loadHeroImage();
  }, []);

  const scrollToPipeline = () => {
    document.getElementById('pipeline-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#E0E0E0] font-sans selection:bg-[#c98a4b] selection:text-[#141414]">
      {/* 1. Sparse Portfolio Top Navigation */}
      <header className="bg-[#141414] border-b border-white/08 px-6 lg:px-12 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-[2px] bg-[#1f1f1f] border border-white/10 text-[#c98a4b]">
              <Radio className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-[16px] tracking-wider text-white font-mono leading-none">
                SONARSENTINEL
              </span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[2px] bg-[#1f1f1f] text-slate-400 border border-white/10">
                SIH26057 • MoES
              </span>
            </div>
          </div>

          <button
            onClick={onLaunchDashboard}
            className="flex items-center gap-2 px-4 py-2 rounded-[2px] bg-[#c98a4b] hover:bg-[#b87d40] text-[#080d16] font-mono text-[12.5px] font-bold tracking-wider uppercase border border-[#96632f] transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#080d16]" />
            <span>LAUNCH LIVE SONAR ANALYSIS</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Section with Generous Negative Space & Dramatic Headline */}
      <section className="relative px-6 lg:px-12 pt-16 lg:pt-24 pb-16 lg:pb-24 border-b border-white/08 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          
          {/* Left Column: Eyebrow + Dramatic Left-Aligned 90-110px Headline + Subtext */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-[2px] bg-[#1f1f1f] text-[#c98a4b] border border-[#c98a4b]/40 uppercase tracking-wider">
                PROBLEM STATEMENT SIH26057
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                Ministry of Earth Sciences
              </span>
            </div>

            {/* Massive Portfolio Headline: 2-3 Lines */}
            <h1 className="text-[48px] sm:text-[72px] lg:text-[96px] xl:text-[104px] font-mono font-black text-white leading-[0.94] tracking-tight">
              Automated<br />
              Underwater<br />
              <span className="text-[#c98a4b]">Debris & Anomaly</span><br />
              Detection
            </h1>

            <p className="text-[15px] sm:text-[16px] font-sans text-slate-300 max-w-2xl leading-relaxed">
              Automated hydroacoustic feature extraction for Side-Scan Sonar (SSS) and Forward-Looking Sonar (FLS). Couples edge neural detection with <strong>physics-informed acoustic shadow ray tracing</strong> and <strong>WGS84 geospatial trigonometry</strong> to eliminate false positives in real-time survey operations.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                onClick={onLaunchDashboard}
                className="px-6 py-3.5 rounded-[2px] bg-[#c98a4b] hover:bg-[#b87d40] text-[#080d16] font-mono font-bold text-[14px] tracking-wider uppercase border border-[#96632f] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-[#080d16]" />
                <span>Launch Live Sonar Analysis</span>
              </button>

              <span className="text-[12.5px] font-mono text-slate-400">
                Sub-20ms Edge Pipeline Latency
              </span>
            </div>
          </div>

          {/* Right Column: Authentic Grainy Sonar Waterfall Visual with Live Detection Box */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full bg-[#181818] border border-white/12 rounded-[2px] p-2 relative shadow-2xl overflow-hidden">
              
              {/* Header Bar on Sonar Visual */}
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/08 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500"></span>
                  LIVE ACOUSTIC SWATH CAPTURE
                </span>
                <span className="text-[#c98a4b]">ALT: 18m • SWATH: 100m</span>
              </div>

              {/* Sonar Image Container */}
              <div className="relative bg-black rounded-[1px] overflow-hidden min-h-[320px] max-h-[380px] flex items-center justify-center border border-white/06">
                {heroSonarUrl ? (
                  <img
                    src={heroSonarUrl}
                    alt="Authentic Sonar Waterfall Record"
                    className="w-full h-full object-cover grayscale contrast-125 opacity-90"
                  />
                ) : (
                  /* Procedural Acoustic Waterfall Texture Fallback */
                  <div className="w-full h-80 bg-[#0d0d0d] relative overflow-hidden flex items-center justify-center">
                    {/* Nadir Water Column */}
                    <div className="absolute inset-y-0 w-8 bg-black/95 border-x border-white/10 left-1/2 -translate-x-1/2 flex items-center justify-center">
                      <span className="text-[8px] font-mono text-slate-600 -rotate-90">NADIR TRACK</span>
                    </div>
                    {/* Rayleigh Speckle Noise Layer */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]"></div>
                  </div>
                )}

                {/* Top Lateral Scale Ruler Overlay */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[10px] font-mono">
                  <span className="px-1.5 py-0.2 rounded-[1px] bg-black/85 border border-white/15 text-slate-300">
                    PORT -50m
                  </span>
                  <span className="px-1.5 py-0.2 rounded-[1px] bg-black/85 border border-[#c98a4b]/40 text-[#c98a4b] font-bold">
                    NADIR 0.0m
                  </span>
                  <span className="px-1.5 py-0.2 rounded-[1px] bg-black/85 border border-white/15 text-slate-300">
                    STBD +50m
                  </span>
                </div>

                {/* Single Dominant Amber Detection Bounding Box Overlay */}
                <div className="absolute top-[28%] right-[16%] w-44 h-24 border-2 border-[#c98a4b] bg-[#c98a4b]/10 pointer-events-none">
                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#c98a4b]"></div>
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#c98a4b]"></div>
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#c98a4b]"></div>
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#c98a4b]"></div>

                  {/* Target Label Badge */}
                  <div className="absolute -top-6 left-0 bg-[#141414] border border-[#c98a4b] px-2 py-0.5 text-[11px] font-mono text-[#c98a4b] font-extrabold flex items-center gap-1.5 whitespace-nowrap shadow-md">
                    <span>CYLINDER · 73%</span>
                    <span className="text-white text-[9px] font-normal">• PHYSICS-VERIFIED</span>
                  </div>

                  {/* Measurement Sub-Readout */}
                  <div className="absolute -bottom-5 left-0 bg-black/90 border border-white/15 px-1.5 py-0.2 text-[9px] font-mono text-slate-300 whitespace-nowrap">
                    HL: 194 | SHDW: 18 | Δ: 10.7x | +24.6m Stbd
                  </div>
                </div>

                {/* Bottom Status Ticker */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-black/85 px-2 py-0.5 border border-white/10 pointer-events-none">
                  <span>LAT: 17.6868°N • LON: 83.2185°E</span>
                  <span className="text-emerald-400 font-bold">RAYLEIGH SHADOW DETECTED</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Circular "Scroll to Explore Pipeline" Indicator */}
        <div className="flex justify-center pt-4">
          <button
            onClick={scrollToPipeline}
            className="group flex flex-col items-center gap-2 text-slate-400 hover:text-[#c98a4b] transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-mono tracking-wider uppercase">
              Scroll to explore architecture
            </span>
            <div className="w-8 h-8 rounded-full border border-white/15 group-hover:border-[#c98a4b] flex items-center justify-center transition-colors bg-[#181818]">
              <ArrowDown className="w-4 h-4 text-[#c98a4b] animate-bounce" />
            </div>
          </button>
        </div>
      </section>

      {/* 4. Full-Width Horizontal Spec Ticker Strip */}
      <section className="w-full bg-[#181818] border-b border-white/08 py-3.5 px-6 overflow-hidden select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 text-[12px] font-mono font-bold text-slate-300 uppercase tracking-wider overflow-x-auto whitespace-nowrap">
          {TICKER_ITEMS.map((item, index) => (
            <React.Fragment key={index}>
              <span className="text-white hover:text-[#c98a4b] transition-colors flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-[1px] bg-[#c98a4b]"></span>
                {item}
              </span>
              {index < TICKER_ITEMS.length - 1 && (
                <span className="text-[#c98a4b]/60 font-black select-none">//</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 5. Main Below-the-Fold Technical Content */}
      <div id="pipeline-section" className="max-w-7xl mx-auto px-6 lg:px-12 py-10 space-y-10 text-left">
        
        {/* Core Technical Innovations Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/08 text-[18px] font-mono font-bold text-white tracking-wide">
            <div className="p-1.5 rounded-[2px] bg-[#1f1f1f] border border-white/10 text-[#c98a4b]">
              <Shield className="w-4 h-4" />
            </div>
            <span>Core Technical Innovations & Engineering Specifications</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-[13px] font-mono">
            <div className="p-4 rounded-[2px] bg-[#1f1f1f] border border-white/08 space-y-1.5">
              <span className="text-[#c98a4b] font-bold text-[14px] block">
                Bilateral Despeckling
              </span>
              <p className="text-slate-300 text-[13px] font-sans leading-relaxed">
                Preserves sharp boundary gradients of thin netting and cables while non-linearly suppressing multiplicative Rayleigh acoustic speckle noise without Gaussian blur.
              </p>
            </div>

            <div className="p-4 rounded-[2px] bg-[#1f1f1f] border border-white/08 space-y-1.5">
              <span className="text-[#c98a4b] font-bold text-[14px] block">
                CLAHE Normalization
              </span>
              <p className="text-slate-300 text-[13px] font-sans leading-relaxed">
                Contrast Limited Adaptive Histogram Equalization compensates for transmission loss and acoustic spreading across lateral swath outer boundaries.
              </p>
            </div>

            <div className="p-4 rounded-[2px] bg-[#1f1f1f] border border-white/08 space-y-1.5">
              <span className="text-[#c98a4b] font-bold text-[14px] block">
                Physics Shadow Ray Tracing
              </span>
              <p className="text-slate-300 text-[13px] font-sans leading-relaxed">
                Ray traces directional acoustic shadows away from the towfish nadir track to confirm physical seabed relief and eliminate false positive reverberations.
              </p>
            </div>

            <div className="p-4 rounded-[2px] bg-[#1f1f1f] border border-white/08 space-y-1.5">
              <span className="text-[#c98a4b] font-bold text-[14px] block">
                WGS84 Swath Trigonometry
              </span>
              <p className="text-slate-300 text-[13px] font-sans leading-relaxed">
                Applies Pythagoras ground-range slant correction and 2D vessel heading rotation matrix to translate pixel indices into sub-meter WGS84 coordinates.
              </p>
            </div>
          </div>
        </section>

        {/* Centerpiece: Interactive 8-Stage Acoustic Pipeline Flow */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/08">
            <div>
              <span className="text-[12px] font-mono font-bold text-[#c98a4b] uppercase tracking-wider block mb-1">
                SYSTEM ARCHITECTURE & EXECUTION FLOW
              </span>
              <h2 className="text-[20px] font-mono font-bold text-white tracking-wide">
                End-to-End Autonomous Hydroacoustic Pipeline
              </h2>
            </div>
            <span className="text-[12.5px] font-mono text-slate-400">
              Click any stage node below to inspect mathematical & technical specifications
            </span>
          </div>

          {/* Interactive Horizontal / Responsive Pipeline Stage Nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isSelected = selectedStage.id === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage)}
                  className={`p-3 rounded-[2px] border text-left transition-all flex flex-col justify-between min-h-[105px] cursor-pointer ${
                    isSelected
                      ? 'bg-[#242424] border-[#c98a4b] text-white ring-1 ring-[#c98a4b]'
                      : 'bg-[#181818] border-white/08 text-slate-400 hover:border-white/20 hover:bg-[#1f1f1f]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[11px] font-mono font-extrabold text-[#c98a4b]">
                      {stage.number}
                    </span>
                    <span className="text-[9.5px] font-mono px-1 py-0.2 rounded-[1px] bg-[#141414] text-slate-400 border border-white/06">
                      {stage.tag.split(' ')[0]}
                    </span>
                  </div>

                  <div className="font-mono font-bold text-[12.5px] text-slate-200 leading-snug line-clamp-2">
                    {stage.shortName}
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
                    {idx < PIPELINE_STAGES.length - 1 ? '→ Next Stage' : '✓ Final Output'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detailed Technical Breakdown Card */}
          <div className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-5 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/08">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-mono font-bold px-2.5 py-1 rounded-[2px] bg-[#141414] text-[#c98a4b] border border-[#c98a4b]/40">
                  STAGE {selectedStage.number}
                </span>
                <h3 className="text-[18px] font-mono font-bold text-white tracking-wide">
                  {selectedStage.name}
                </h3>
              </div>

              <span className="text-[12px] font-mono text-slate-400 px-2 py-0.5 rounded-[2px] bg-[#141414] border border-white/08">
                Module: {selectedStage.module}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Details */}
              <div className="lg:col-span-7 space-y-3">
                <div>
                  <span className="text-[11.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                    Operational Purpose
                  </span>
                  <p className="text-[14px] font-sans text-slate-200 leading-relaxed">
                    {selectedStage.summary}
                  </p>
                </div>

                <div>
                  <span className="text-[11.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                    Technical Implementation & Justification
                  </span>
                  <p className="text-[13.5px] font-sans text-slate-300 leading-relaxed">
                    {selectedStage.technicalDetails}
                  </p>
                </div>
              </div>

              {/* Right Algorithm & Code Formula Box */}
              <div className="lg:col-span-5 bg-[#141414] border border-white/08 rounded-[2px] p-4 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1.5 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#c98a4b]" />
                    Algorithm & Formula Reference
                  </span>
                  <div className="p-2.5 rounded-[2px] bg-[#0d0d0d] border border-white/06 font-mono text-[12.5px] text-[#c98a4b] break-all leading-relaxed">
                    {selectedStage.algorithm}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/06 flex items-center justify-between text-[12px] font-mono text-slate-400">
                  <span>Pipeline Latency Target:</span>
                  <span className="text-emerald-400 font-bold">&lt; 20 ms Total</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Evaluator Quick Guide (Standard Operating Procedure) */}
        <section className="bg-[#1f1f1f] border border-white/08 rounded-[2px] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/08">
            <div className="flex items-center gap-2.5 text-[18px] font-mono font-bold text-white tracking-wide">
              <div className="p-1.5 rounded-[2px] bg-[#141414] border border-white/10 text-[#c98a4b]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Evaluator Standard Operating Procedure (Step-by-Step Test Guide)</span>
            </div>
            <span className="text-[12px] font-mono text-slate-400 hidden sm:inline">
              Follow numbered test sequence for evaluation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {EVALUATOR_STEPS.map((step) => (
              <div
                key={step.step}
                className="bg-[#141414] border border-white/06 p-3.5 rounded-[2px] flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-extrabold px-1.5 py-0.2 rounded-[1px] bg-[#242424] text-[#c98a4b] border border-[#c98a4b]/30">
                      STEP {step.step}
                    </span>
                    <h4 className="text-[14px] font-mono font-bold text-slate-100">
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-[13px] font-sans text-slate-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Preset Direct Triggers */}
          {presets && presets.length > 0 && (
            <div className="pt-3 border-t border-white/08">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[12.5px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Direct Launch with Standardized MoES Benchmark Scenario:
                </span>
                <span className="text-[11.5px] font-mono text-slate-500">
                  Instant Ingestion & 1-Click Execution
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {presets.map((p) => {
                  const pColor = CLASS_COLORS[p.target_type] || CLASS_COLORS.unknown_anomaly;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectPresetAndLaunch(p)}
                      className="group flex items-center justify-between p-3 rounded-[2px] bg-[#181818] border border-white/08 hover:border-[#c98a4b] hover:bg-[#242424] transition-colors text-left font-mono cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <div className="text-[13px] font-bold text-slate-200 group-hover:text-white truncate">
                          {p.name.split('—')[0]}
                        </div>
                        <div className="text-[11.5px] text-slate-400 truncate mt-0.5">
                          {p.target_type.replace('_', ' ')} • {p.nav.vessel_lat.toFixed(2)}°N
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-[#c98a4b] flex-shrink-0 font-bold">
                        <span>Run</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Footer */}
      <footer className="mt-12 py-5 border-t border-white/08 bg-[#141414] text-center font-mono text-[12px] text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400">
          <div>
            Ministry of Earth Sciences (MoES) • Smart India Hackathon Track SIH26057
          </div>
          <div className="text-[11px] text-slate-500">
            Automated SSS & FLS Acoustic Anomaly Processing Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}
