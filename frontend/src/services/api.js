import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
});

export const checkHealth = async () => {
  const res = await apiClient.get('/health');
  return res.data;
};

export const fetchSamplePresets = async () => {
  const res = await apiClient.get('/api/samples');
  return res.data;
};

export const fetchSampleImageBlob = async (filename) => {
  const res = await apiClient.get(`/api/samples/${filename}`, {
    responseType: 'blob',
  });
  return res.data;
};

export const analyzeSonarImage = async (formData) => {
  const res = await apiClient.post('/api/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const getReportDownloadUrl = (missionId, format) => {
  return `${API_BASE}/api/report/${missionId}/${format}`;
};
