import React, { useEffect } from 'react';
import { 
  checkHealth, fetchSamplePresets, fetchSampleImageBlob, 
  analyzeSonarImage 
} from './services/api';
import { useSonarContext } from './context/SonarContext';
import { toast } from 'sonner';

import LandingPage from './components/LandingPage';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import PresetSelector from './components/PresetSelector';
import TelemetryControl from './components/TelemetryControl';
import SonarViewer from './components/SonarViewer';
import DetectionInspector from './components/DetectionInspector';
import MaritimeMap from './components/MaritimeMap';
import ReportModal from './components/ReportModal';

export default function App() {
  const { state, dispatch } = useSonarContext();

  const {
    currentView,
    systemHealth,
    presets,
    selectedPreset,
    file,
    previewUrl,
    telemetry,
    isAnalyzing,
    analysisResult,
    selectedDetection,
    isReportModalOpen
  } = state;

  // 1. Initial Health & Presets Fetch
  useEffect(() => {
    const initSystem = async () => {
      try {
        const health = await checkHealth();
        dispatch({ type: 'SET_HEALTH', payload: health });
      } catch (err) {
        console.warn('Backend connection error:', err);
      }

      try {
        const sampleList = await fetchSamplePresets();
        dispatch({ type: 'SET_PRESETS', payload: sampleList });
        if (sampleList && sampleList.length > 0) {
          handlePresetSelect(sampleList[0], false);
        }
      } catch (err) {
        console.warn('Could not fetch preset scenarios:', err);
      }
    };

    initSystem();
  }, []);

  // 2. Preset Selection Handler
  const handlePresetSelect = async (preset, showToast = true) => {
    if (showToast) {
      toast.info(`Scenario loaded: ${preset.filename || preset.name || 'Preset'}`);
    }

    let sampleFile = null;
    let url = '';

    try {
      const blob = await fetchSampleImageBlob(preset.filename);
      sampleFile = new File([blob], preset.filename, { type: 'image/png' });
      url = URL.createObjectURL(sampleFile);
    } catch (err) {
      console.error('Failed to load sample image blob:', err);
    }

    dispatch({
      type: 'SELECT_PRESET',
      payload: { preset, file: sampleFile, previewUrl: url }
    });
  };

  // 3. Preset Direct Fast-Launch from Landing Page
  const handlePresetAndLaunch = async (preset) => {
    await handlePresetSelect(preset, true);
    dispatch({ type: 'SET_VIEW', payload: 'dashboard' });
  };

  // 4. File Input Handler
  const handleFileChange = (newFile) => {
    if (newFile) {
      const url = URL.createObjectURL(newFile);
      dispatch({ type: 'SET_FILE', payload: { file: newFile, previewUrl: url } });
    } else {
      dispatch({ type: 'SET_FILE', payload: { file: null, previewUrl: '' } });
    }
  };

  // 5. Run Sonar Analysis
  const handleRunAnalysis = async () => {
    if (!file) {
      toast.error('Please upload a sonar image or select a quick-demo scenario.');
      return;
    }

    toast.promise(
      (async () => {
        dispatch({ type: 'SET_ANALYZING', payload: true });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('vessel_lat', telemetry.vessel_lat);
        formData.append('vessel_lon', telemetry.vessel_lon);
        formData.append('heading', telemetry.heading);
        formData.append('altitude', telemetry.altitude);
        formData.append('swath_width_m', telemetry.swath_width_m);
        formData.append('mission_name', telemetry.mission_name || 'MoES-Survey');

        try {
          const result = await analyzeSonarImage(formData);
          dispatch({ type: 'RUN_ANALYSIS_SUCCESS', payload: result });
          return result;
        } catch (err) {
          const errMessage = err.response?.data?.message || err.message || 'Sonar analysis failed.';
          dispatch({ type: 'RUN_ANALYSIS_ERROR', payload: errMessage });
          throw err;
        }
      })(),
      {
        loading: 'Running sonar analysis...',
        success: (data) => `🎯 ${data.detections?.length ?? 0} target(s) detected`,
        error: 'Analysis failed — check backend connection'
      }
    );
  };

  // 6. Reset Handler
  const handleReset = () => {
    dispatch({ type: 'RESET_ALL' });
    toast.info('Session reset to default telemetry.');
  };

  // If on Landing Page, render the interactive architecture centerpiece
  if (currentView === 'landing') {
    return (
      <LandingPage
        onLaunchDashboard={() => dispatch({ type: 'SET_VIEW', payload: 'dashboard' })}
        presets={presets}
        onSelectPresetAndLaunch={handlePresetAndLaunch}
      />
    );
  }

  // Otherwise render Live Operator Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-[#141414] text-[#E0E0E0] font-sans selection:bg-[#c98a4b] selection:text-[#141414]">
      {/* Tactical Header with Return to Architecture Link */}
      <Header
        onOpenReport={() => dispatch({ type: 'TOGGLE_REPORT_MODAL', payload: true })}
        onReturnToLanding={() => dispatch({ type: 'SET_VIEW', payload: 'landing' })}
      />

      {/* Main Command Center Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-4">
        {/* Asymmetric State-Driven Calibrated Transects */}
        <PresetSelector
          onSelectPreset={(p) => handlePresetSelect(p, true)}
        />

        {/* KPI Metrics Summary Row */}
        <MetricCards />

        {/* 2-Column Tactical Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (5 Cols): Telemetry Ingestion + Inspector */}
          <div className="lg:col-span-5 space-y-4">
            <TelemetryControl
              onFileChange={handleFileChange}
              onTelemetryChange={(val) => dispatch({ type: 'UPDATE_TELEMETRY', payload: val })}
              onAnalyze={handleRunAnalysis}
              onReset={handleReset}
            />

            <DetectionInspector />
          </div>

          {/* Right Column (7 Cols): Sonar Swath Viewport + GIS Map */}
          <div className="lg:col-span-7 space-y-4">
            <SonarViewer
              onSelectDetection={(det) => dispatch({ type: 'SET_SELECTED_DETECTION', payload: det })}
            />

            <MaritimeMap
              onSelectDetection={(det) => dispatch({ type: 'SET_SELECTED_DETECTION', payload: det })}
            />
          </div>
        </div>
      </main>

      {/* Mission Intelligence Report Modal */}
      <ReportModal
        onClose={() => dispatch({ type: 'TOGGLE_REPORT_MODAL', payload: false })}
      />

      {/* Tactical Nautical Footer */}
      <footer className="mt-8 py-5 border-t border-white/08 bg-[#141414] text-center font-mono text-[12.5px] text-slate-500 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2.5 text-slate-400">
          <span>Ministry of Earth Sciences (MoES)</span>
          <span>•</span>
          <span className="text-[#c98a4b] font-bold">SIH26057 Track</span>
          <span>•</span>
          <span>Autonomous Hydrographic Threat Intelligence</span>
        </div>
        <p className="text-slate-600 text-[11.5px]">
          WGS84 Sonar Swath Trigonometry Engine • Bilateral & CLAHE Acoustic Processing
        </p>
      </footer>
    </div>
  );
}
