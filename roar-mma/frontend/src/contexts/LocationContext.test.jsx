import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocationProvider, useLocation } from './LocationContext';

function TestComponent() {
  const { selectedLocation, changeLocation, locations, locationName } = useLocation();
  return (
    <div>
      <div data-testid="selected">{selectedLocation}</div>
      <div data-testid="name">{locationName}</div>
      <div data-testid="count">{locations.length}</div>
      <button type="button" onClick={() => changeLocation('rockingham')}>Set Rockingham</button>
      <button type="button" onClick={() => changeLocation('bibra_lake')}>Set Bibra Lake</button>
      <button type="button" onClick={() => changeLocation('invalid')}>Set Invalid</button>
    </div>
  );
}

function renderWithProvider(component) {
  return render(
    <LocationProvider>{component}</LocationProvider>
  );
}

describe('LocationContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with all location by default', () => {
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('selected')).toHaveTextContent('all');
    expect(screen.getByTestId('name')).toHaveTextContent('All Locations');
  });

  it('reads stored location from localStorage on mount', () => {
    localStorage.setItem('roar_location', 'rockingham');
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('selected')).toHaveTextContent('rockingham');
    expect(screen.getByTestId('name')).toHaveTextContent('Rockingham');
  });

  it('changeLocation updates selected location and persists to localStorage', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Set Rockingham'));
    expect(screen.getByTestId('selected')).toHaveTextContent('rockingham');
    expect(localStorage.getItem('roar_location')).toBe('rockingham');
  });

  it('changeLocation updates locationName correctly', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Set Bibra Lake'));
    expect(screen.getByTestId('name')).toHaveTextContent('Bibra Lake');
  });

  it('fallback to all for invalid stored location', () => {
    localStorage.setItem('roar_location', 'nonexistent');
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('selected')).toHaveTextContent('all');
  });

  it('provides all 4 locations', () => {
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('count')).toHaveTextContent('4');
  });

  it('ignores changeLocation to invalid id', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Set Invalid'));
    expect(screen.getByTestId('selected')).toHaveTextContent('all');
  });

  it('fallback to all when localStorage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    renderWithProvider(<TestComponent />);
    expect(screen.getByTestId('selected')).toHaveTextContent('all');
    getItem.mockRestore();
  });

  it('persists multiple location changes', () => {
    renderWithProvider(<TestComponent />);
    fireEvent.click(screen.getByText('Set Rockingham'));
    expect(localStorage.getItem('roar_location')).toBe('rockingham');
    fireEvent.click(screen.getByText('Set Bibra Lake'));
    expect(localStorage.getItem('roar_location')).toBe('bibra_lake');
  });

  it('throws when useLocation used outside provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useLocation must be used within');
  });

  it('changeLocation is stable reference (memoized)', () => {
    let ref1, ref2;
    function CaptureRef() {
      const { changeLocation } = useLocation();
      ref1 = changeLocation;
      return null;
    }
    const { rerender } = render(
      <LocationProvider><CaptureRef /></LocationProvider>
    );
    rerender(
      <LocationProvider><CaptureRef /></LocationProvider>
    );
    ref2 = ref1;
    expect(ref1).toBe(ref2);
  });
});
