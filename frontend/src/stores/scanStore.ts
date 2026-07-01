import { create } from 'zustand';
import type { Scan, AnalyzerResult, ResultStats, Severity, AnalyzerCategory } from '../types';
import { scanApi } from '../services/api';

interface ScanState {
  scans: Scan[];
  currentScan: Scan | null;
  results: AnalyzerResult[];
  stats: ResultStats | null;
  score: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    severity: Severity | null;
    category: AnalyzerCategory | null;
    search: string;
  };
  
  // Actions
  fetchScans: (page?: number, pageSize?: number) => Promise<void>;
  createScan: (url: string, options?: Partial<Scan['options']>) => Promise<Scan>;
  fetchScan: (id: string) => Promise<void>;
  deleteScan: (id: string) => Promise<void>;
  fetchResults: (id: string) => Promise<void>;
  setFilters: (filters: Partial<ScanState['filters']>) => void;
  clearError: () => void;
  reset: () => void;
}

const initialFilters = {
  severity: null as Severity | null,
  category: null as AnalyzerCategory | null,
  search: '',
};

export const useScanStore = create<ScanState>((set) => ({
  scans: [],
  currentScan: null,
  results: [],
  stats: null,
  score: 0,
  isLoading: false,
  error: null,
  filters: initialFilters,

  fetchScans: async (page = 1, pageSize = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { items } = await scanApi.getAll(page, pageSize);
      set({ scans: items, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createScan: async (url, options) => {
    set({ isLoading: true, error: null });
    try {
      const scan = await scanApi.create(url, options);
      set((state) => ({ scans: [scan, ...state.scans], isLoading: false }));
      return scan;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  fetchScan: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const scan = await scanApi.getById(id);
      set({ currentScan: scan, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  deleteScan: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await scanApi.delete(id);
      set((state) => ({
        scans: state.scans.filter((s) => s.id !== id),
        currentScan: state.currentScan?.id === id ? null : state.currentScan,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchResults: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { results, stats, score } = await scanApi.getResults(id);
      set({ results, stats, score, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    scans: [],
    currentScan: null,
    results: [],
    stats: null,
    score: 0,
    isLoading: false,
    error: null,
    filters: initialFilters,
  }),
}));

export const selectFilteredResults = (state: ScanState): AnalyzerResult[] => {
  const { results, filters } = state;
  
  return results.filter((result) => {
    if (filters.severity && result.severity !== filters.severity) return false;
    if (filters.category && result.category !== filters.category) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesTitle = result.title.toLowerCase().includes(search);
      const matchesDesc = result.description.toLowerCase().includes(search);
      if (!matchesTitle && !matchesDesc) return false;
    }
    return true;
  });
};
