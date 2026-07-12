import React, { createContext, useCallback, useContext, useState } from 'react';

// ── No MMKV / no persistence lib in this section of the app ─────────────────
// History and settings simply live in React state for the lifetime of the
// app session (they reset on reload/restart). If this section is later wired
// into the full app, swap the useState calls below for whatever persistence
// the full app already uses (MMKV, AsyncStorage, a backend, etc.) — every
// other screen only talks to this file via useAppData(), so nothing else
// would need to change.

export const DEFAULT_SETTINGS = {
  unitSystem: 'metric',
  theme: 'light',
  currency: '',
};

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const addHistoryEntry = useCallback((entry) => {
    setHistory(prev => [entry, ...prev].slice(0, 200));
  }, []);

  const deleteHistoryEntry = useCallback((id) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const value = {
    history,
    settings,
    addHistoryEntry,
    deleteHistoryEntry,
    clearAllHistory,
    updateSetting,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData() must be called inside an <AppDataProvider>');
  }
  return ctx;
}
