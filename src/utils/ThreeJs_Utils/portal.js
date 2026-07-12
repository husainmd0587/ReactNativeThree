// portal.js
import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

const PortalContext = createContext(null);

export function PortalProvider({ children }) {
  const [portals, setPortals] = useState({});

  const addPortal = useCallback((key, node) => {
    setPortals((prev) => ({ ...prev, [key]: node }));
  }, []);

  const removePortal = useCallback((key) => {
    setPortals((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Stable reference — consumers that only read addPortal/removePortal
  // (every Workshop3DModal instance) won't re-render when `portals` changes.
  const contextValue = useMemo(() => ({ addPortal, removePortal }), [addPortal, removePortal]);

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
      {Object.entries(portals).map(([key, node]) => (
        <React.Fragment key={key}>{node}</React.Fragment>
      ))}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within a <PortalProvider>');
  return ctx;
}

export function usePortalKey(prefix = 'portal') {
  const ref = useRef(`${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`);
  return ref.current;
}