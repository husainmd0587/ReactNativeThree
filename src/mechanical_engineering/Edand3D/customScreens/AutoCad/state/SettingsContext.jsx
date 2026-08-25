import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cadPractice:settings';

export const DEFAULT_SETTINGS = {
  canvasBackground: '#FBFBFD',
  shapeColor: '#2E7DAF',
  selectedColor: '#E0524C',
  dimensionColor: '#8A8A9A',
  crosshairColor: '#4A4A55',
};

const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
  loaded: false,
});

// Loads persisted settings once on mount, then keeps every update in sync
// with AsyncStorage. Any screen under the plugin's navigator can read/write
// through useSettings() — see index.js for where this Provider is mounted.
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        setSettings((prev) => ({ ...prev, ...parsed }));
      })
      .catch(() => {
        // Corrupt or unavailable storage — fall back to defaults silently,
        // same as any other best-effort local cache.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    persist(DEFAULT_SETTINGS);
  }, [persist]);

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings, loaded }),
    [settings, updateSetting, resetSettings, loaded],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
