import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  currentView: 'landing',
  systemHealth: null,
  presets: [],
  selectedPreset: null,
  file: null,
  previewUrl: '',
  telemetry: {
    vessel_lat: 13.0827,
    vessel_lon: 80.2707,
    heading: 85.0,
    altitude: 18.0,
    swath_width_m: 100.0,
    mission_name: 'MoES-Chennai-Transect-04'
  },
  isAnalyzing: false,
  analysisResult: null,
  selectedDetection: null,
  isReportModalOpen: false,
  error: null
};

function sonarReducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_HEALTH':
      return { ...state, systemHealth: action.payload };
    case 'SET_PRESETS':
      return { ...state, presets: action.payload };
    case 'SELECT_PRESET':
      return {
        ...state,
        selectedPreset: action.payload.preset,
        file: action.payload.file || state.file,
        previewUrl: action.payload.previewUrl || state.previewUrl,
        telemetry: action.payload.preset?.nav
          ? { ...state.telemetry, ...action.payload.preset.nav }
          : state.telemetry,
        error: null
      };
    case 'SET_FILE':
      return {
        ...state,
        file: action.payload.file,
        previewUrl: action.payload.previewUrl,
        selectedPreset: null,
        error: null
      };
    case 'UPDATE_TELEMETRY':
      return {
        ...state,
        telemetry: typeof action.payload === 'function' 
          ? action.payload(state.telemetry)
          : { ...state.telemetry, ...action.payload }
      };
    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload, error: action.payload ? null : state.error };
    case 'RUN_ANALYSIS_SUCCESS':
      return {
        ...state,
        isAnalyzing: false,
        analysisResult: action.payload,
        selectedDetection: action.payload?.detections?.[0] || null,
        error: null
      };
    case 'RUN_ANALYSIS_ERROR':
      return {
        ...state,
        isAnalyzing: false,
        error: action.payload
      };
    case 'SET_SELECTED_DETECTION':
      return { ...state, selectedDetection: action.payload };
    case 'TOGGLE_REPORT_MODAL':
      return {
        ...state,
        isReportModalOpen: typeof action.payload === 'boolean' ? action.payload : !state.isReportModalOpen
      };
    case 'RESET_ALL':
      return {
        ...state,
        file: null,
        previewUrl: '',
        analysisResult: null,
        selectedDetection: null,
        selectedPreset: null,
        error: null
      };
    default:
      return state;
  }
}

const SonarContext = createContext();

export const useSonarContext = () => {
  const context = useContext(SonarContext);
  if (!context) {
    throw new Error('useSonarContext must be used within a SonarProvider');
  }
  return context;
};

export default function SonarProvider({ children }) {
  const [state, dispatch] = useReducer(sonarReducer, initialState);

  return (
    <SonarContext.Provider value={{ state, dispatch }}>
      {children}
    </SonarContext.Provider>
  );
}
