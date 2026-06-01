import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const LocationContext = createContext(null);

const LOCATIONS = Object.freeze([
  { id: 'all', name: 'All Locations' },
  { id: 'rockingham', name: 'Rockingham' },
  { id: 'bibra_lake', name: 'Bibra Lake' },
  { id: '247_gym', name: '24/7 Gym' },
]);

const STORAGE_KEY = 'roar_location';
const isBrowser = typeof window !== 'undefined';

function readStoredLocation() {
  if (!isBrowser) return 'all';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LOCATIONS.some(l => l.id === stored)) return stored;
    return 'all';
  } catch {
    return 'all';
  }
}

function writeStoredLocation(locId) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, locId);
  } catch {
    if (typeof console !== 'undefined') console.warn('LocationContext: localStorage write failed (quota or denied)');
  }
}

export function LocationProvider({ children }) {
  const [selectedLocation, setSelectedLocation] = useState(readStoredLocation);

  const changeLocation = useCallback((locId) => {
    if (!LOCATIONS.some(l => l.id === locId)) return;
    setSelectedLocation(locId);
    writeStoredLocation(locId);
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const handler = (e) => {
      if (e.key === STORAGE_KEY) {
        const val = e.newValue || 'all';
        if (LOCATIONS.some(l => l.id === val)) setSelectedLocation(val);
      }
    };
    try { window.addEventListener('storage', handler); } catch {}
    return () => { try { window.removeEventListener('storage', handler); } catch {} };
  }, []);

  const value = useMemo(() => ({
    selectedLocation,
    changeLocation,
    locations: LOCATIONS,
    locationName: LOCATIONS.find(l => l.id === selectedLocation)?.name || 'All Locations',
  }), [selectedLocation, changeLocation]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within a <LocationProvider>');
  return ctx;
}
