import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Current analysis
  currentResult:  null,
  loading:        false,
  error:          null,
  loadingStep:    '',

  // Compare
  compareResult:  null,
  compareLoading: false,

  // History
  history:        [],
  historyLoading: false,

  setLoading:      (loading, step = '') => set({ loading, loadingStep: step }),
  setError:        (error)  => set({ error, loading: false }),
  setResult:       (result) => set({ currentResult: result, loading: false, error: null }),
  setCompare:      (result) => set({ compareResult: result, compareLoading: false }),
  setHistory:      (history) => set({ history, historyLoading: false }),
  clearResult:     () => set({ currentResult: null, error: null }),
}))
