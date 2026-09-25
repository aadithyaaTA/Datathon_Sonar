import React, { useState, useEffect } from 'react';
import { 
  Radio, Cpu, FileText, 
  Clock, Satellite, LayoutDashboard, ArrowLeft 
} from 'lucide-react';

export default function Header({ systemHealth, analysisResult, onOpenReport, onReturnToLanding }) {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const isAiMode = systemHealth?.mode === 'AI';

  return (
    <header className="bg-[#1a1a1a] sticky top-0 z-50 px-4 lg:px-8 py-3.5 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Architecture Link */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-[2px] bg-[#242424] border border-white/10 text-[#c98a4b]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-extrabold text-[22px] tracking-wider text-white flex items-center gap-1.5 font-mono leading-none">
                SONAR<span className="text-[#c98a4b]">SENTINEL</span>
              </h1>
              <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded-[2px] bg-[#242424] text-slate-300 border border-white/10">
                SIH26057 • MoES
              </span>
            </div>
            <p className="text-[13px] text-slate-400 font-mono tracking-tight flex items-center gap-2 mt-1">
              <span>Autonomous Underwater Anomaly Detection</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300">Hydrographic AI</span>
            </p>
          </div>
        </div>

        {/* Right: Live Telemetry Status Badges & Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Return to Architecture Link */}
          {onReturnToLanding && (
            <button
              onClick={onReturnToLanding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#141414] hover:bg-[#242424] border border-white/10 text-slate-300 hover:text-white transition-colors text-[12.5px] font-mono cursor-pointer"
              title="Return to System Architecture & Evaluator Guide"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#c98a4b]" />
              <span>SYSTEM ARCHITECTURE</span>
            </button>
          )}

          {/* UTC Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#242424] border border-white/10 text-[12.5px] font-mono text-slate-300">
            <Clock className="w-4 h-4 text-[#c98a4b]" />
            <span>{utcTime || '00:00:00 UTC'}</span>
          </div>

          {/* GPS Fix */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#242424] border border-white/10 text-[12.5px] font-mono text-slate-300">
            <span className="w-2 h-2 rounded-[1px] bg-emerald-500"></span>
            <span className="text-slate-400">NAV:</span>
            <span className="text-slate-200 font-medium">WGS84 3D FIX</span>
          </div>

          {/* Pipeline Mode */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#242424] border border-white/10 text-[12.5px] font-mono text-slate-300">
            <Cpu className="w-4 h-4 text-[#c98a4b]" />
            <span className="text-slate-400">MODE:</span>
            <span className="font-semibold text-slate-200">
              {isAiMode ? 'YOLOv8 AI' : 'DEMO ENGINE'}
            </span>
          </div>

          {/* Mission Report Button */}
          {analysisResult && (
            <button
              onClick={onOpenReport}
              className="flex items-center gap-2 px-4 py-1.5 rounded-[2px] bg-[#242424] hover:bg-[#2e2e2e] border border-white/15 text-[#c98a4b] hover:text-white transition-colors text-[13px] font-mono font-bold cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>EXPORT REPORT</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
