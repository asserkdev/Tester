import axios from 'axios';
import type { Scan, AnalyzerResult, AnalyzerInfo, APIResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scanApi = {
  create: async (url: string, options?: Partial<Scan['options']>): Promise<Scan> => {
    const response = await api.post<APIResponse<Scan>>('/scans', { url, options });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create scan');
    }
    return response.data.data;
  },

  getAll: async (page = 1, pageSize = 20): Promise<{ items: Scan[]; total: number }> => {
    const response = await api.get<APIResponse<Scan[]> & { total: number }>('/scans', {
      params: { page, pageSize },
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch scans');
    }
    return { items: response.data.data || [], total: response.data.total || 0 };
  },

  getById: async (id: string): Promise<Scan> => {
    const response = await api.get<APIResponse<Scan>>(`/scans/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Scan not found');
    }
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await api.delete(`/scans/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete scan');
    }
  },

  cancel: async (id: string): Promise<void> => {
    const response = await api.post(`/scans/${id}/cancel`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to cancel scan');
    }
  },

  getResults: async (id: string): Promise<{
    results: AnalyzerResult[];
    stats: { total: number; bySeverity: Record<string, number>; byCategory: Record<string, number> };
    score: number;
  }> => {
    const response = await api.get<APIResponse<AnalyzerResult[]> & { stats: any; score: number }>(
      `/scans/${id}/results`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch results');
    }
    return {
      results: response.data.data || [],
      stats: response.data.stats || { total: 0, bySeverity: {}, byCategory: {} },
      score: response.data.score || 0,
    };
  },
};

export const analyzerApi = {
  getAll: async (): Promise<{ analyzers: AnalyzerInfo[]; categories: string[] }> => {
    const response = await api.get<APIResponse<AnalyzerInfo[]> & { categories: string[] }>('/analyzers');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch analyzers');
    }
    return { analyzers: response.data.data || [], categories: response.data.categories || [] };
  },

  getById: async (id: string): Promise<AnalyzerInfo> => {
    const response = await api.get<APIResponse<AnalyzerInfo>>(`/analyzers/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Analyzer not found');
    }
    return response.data.data;
  },
};

export default api;
