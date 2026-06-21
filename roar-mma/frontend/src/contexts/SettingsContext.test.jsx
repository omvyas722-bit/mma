import { render, screen, fireEvent, act, waitFor, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettingsProvider, useSettings, useSetting, useFeature } from './SettingsContext';
import { NotificationProvider } from './NotificationContext';
import { settingsApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  settingsApi: {
    getAll: vi.fn(),
    getLocations: vi.fn(),
    update: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    testEmailConfig: vi.fn(),
    testSMSConfig: vi.fn(),
  },
}));

const DEFAULT_SETTINGS = {
  general: { gymName: 'ROAR MMA', email: '', phone: '', address: '', timezone: 'Australia/Perth', currency: 'AUD', dateFormat: 'DD/MM/YYYY', timeFormat: '24h' },
  business: { businessHoursStart: '06:00', businessHoursEnd: '22:00', bookingInterval: 30, cancellationPolicy: 24, lateArrivalGrace: 15 },
  membership: { trialPeriodDays: 7, autoRenewal: true, gracePeriodDays: 3, freezeMaxDays: 30, freezeAllowedPerYear: 2 },
  notifications: { emailEnabled: true, smsEnabled: true, classReminders: true, classReminderHours: 2, paymentReminders: true, paymentReminderDays: 3, birthdayMessages: true, membershipExpiry: true, membershipExpiryDays: 7 },
  integrations: { stripeEnabled: false, stripePublicKey: '', stripeSecretKey: '', sendgridEnabled: false, sendgridApiKey: '', sendgridFromEmail: '', twilioEnabled: false, twilioAccountSid: '', twilioAuthToken: '', twilioPhoneNumber: '' },
  features: { onlineBooking: true, memberPortal: true, waitlist: true, guestPasses: true, referralProgram: true, loyaltyPoints: false },
};

function TestComponent() {
  const ctx = useSettings();
  return (
    <div>
      <div data-testid="loading">{ctx.isLoading.toString()}</div>
      <div data-testid="saving">{ctx.isSaving.toString()}</div>
      <div data-testid="gymName">{ctx.settings.general.gymName}</div>
      <div data-testid="locationCount">{ctx.locations.length}</div>
      <div data-testid="trialDays">{ctx.settings.membership.trialPeriodDays}</div>
      <button type="button" onClick={() => ctx.updateSettings({ general: { gymName: 'New Gym' } })}>
        Update Settings
      </button>
      <button type="button" onClick={() => ctx.updateSection('general', { email: 'test@test.com' })}>
        Update Section
      </button>
      <button type="button" onClick={() => ctx.resetSettings()}>
        Reset Settings
      </button>
      <button type="button" onClick={() => ctx.exportSettings()}>
        Export Settings
      </button>
    </div>
  );
}

function renderWithProviders(component) {
  return render(
    <NotificationProvider>
      <SettingsProvider>{component}</SettingsProvider>
    </NotificationProvider>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsApi.getAll.mockResolvedValue({ general: { gymName: 'ROAR MMA' } });
    settingsApi.getLocations.mockResolvedValue([{ id: 1, name: 'Rockingham' }]);
  });

  it('loads settings and locations on mount', async () => {
    renderWithProviders(<TestComponent />);
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(settingsApi.getAll).toHaveBeenCalledTimes(1);
    expect(settingsApi.getLocations).toHaveBeenCalledTimes(1);
  });

  it('renders default settings when API call fails', async () => {
    settingsApi.getAll.mockRejectedValue(new Error('Network error'));
    settingsApi.getLocations.mockResolvedValue([]);
    renderWithProviders(<TestComponent />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('gymName')).toHaveTextContent('ROAR MMA');
  });

  it('merges API response with defaults', async () => {
    settingsApi.getAll.mockResolvedValue({ general: { gymName: 'Override Gym' } });
    renderWithProviders(<TestComponent />);
    await waitFor(() => {
      expect(screen.getByTestId('gymName')).toHaveTextContent('Override Gym');
    });
  });

  it('isSaving is true during updateSettings then false', async () => {
    let resolveUpdate;
    settingsApi.update.mockImplementation(() => new Promise(resolve => { resolveUpdate = resolve; }));
    settingsApi.getAll.mockResolvedValue({});
    settingsApi.getLocations.mockResolvedValue([]);
    renderWithProviders(<TestComponent />);
    await waitFor(() => { expect(screen.getByTestId('saving')).toHaveTextContent('false'); });
    await act(async () => { fireEvent.click(screen.getByText('Update Settings')); });
    await waitFor(() => expect(screen.getByTestId('saving')).toHaveTextContent('true'));
    await act(async () => { resolveUpdate({}); });
    await waitFor(() => expect(screen.getByTestId('saving')).toHaveTextContent('false'));
  });

  it('updateSettings calls API and merges nested settings', async () => {
    settingsApi.getAll.mockResolvedValue({});
    settingsApi.getLocations.mockResolvedValue([]);
    settingsApi.update.mockResolvedValue({});
    renderWithProviders(<TestComponent />);
    await waitFor(() => { expect(screen.getByTestId('loading')).toHaveTextContent('false'); });
    const btn = screen.getByText('Update Settings');
    await act(async () => { fireEvent.click(btn); });
    expect(settingsApi.update).toHaveBeenCalledWith({ general: { gymName: 'New Gym' } });
  });

  it('updateSection delegates to updateSettings', async () => {
    settingsApi.getAll.mockResolvedValue({});
    settingsApi.getLocations.mockResolvedValue([]);
    settingsApi.update.mockResolvedValue({});
    renderWithProviders(<TestComponent />);
    await waitFor(() => { expect(screen.getByTestId('loading')).toHaveTextContent('false'); });
    await act(async () => { fireEvent.click(screen.getByText('Update Section')); });
    expect(settingsApi.update).toHaveBeenCalledWith({ general: { email: 'test@test.com' } });
  });

  it('updateSettings returns success false on API error', async () => {
    settingsApi.getAll.mockResolvedValue({});
    settingsApi.getLocations.mockResolvedValue([]);
    settingsApi.update.mockRejectedValue(new Error('Save failed'));
    renderWithProviders(<TestComponent />);
    await waitFor(() => { expect(screen.getByTestId('loading')).toHaveTextContent('false'); });
    await act(async () => {
      fireEvent.click(screen.getByText('Update Settings'));
    });
    await waitFor(() => { expect(screen.getByTestId('saving')).toHaveTextContent('false'); });
  });

  it('resetSettings calls API with defaults', async () => {
    settingsApi.getAll.mockResolvedValue({ general: { gymName: 'Custom' } });
    settingsApi.getLocations.mockResolvedValue([]);
    settingsApi.update.mockResolvedValue({});
    renderWithProviders(<TestComponent />);
    await waitFor(() => { expect(screen.getByTestId('loading')).toHaveTextContent('false'); });
    await act(async () => { fireEvent.click(screen.getByText('Reset Settings')); });
    expect(settingsApi.update).toHaveBeenCalledWith(expect.objectContaining({ general: expect.objectContaining({ gymName: 'ROAR MMA' }) }));
  });

  it('exportSettings triggers download with settings JSON', async () => {
    settingsApi.getAll.mockResolvedValue({ general: { gymName: 'Test Gym' } });
    settingsApi.getLocations.mockResolvedValue([]);
    const createObj = vi.fn(() => 'blob:url');
    const revokeObj = vi.fn();
    globalThis.URL.createObjectURL = createObj;
    globalThis.URL.revokeObjectURL = revokeObj;
    const { result } = renderHook(() => useSettings(), {
      wrapper: ({ children }) => <NotificationProvider><SettingsProvider>{children}</SettingsProvider></NotificationProvider>,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.exportSettings(); });
    expect(createObj).toHaveBeenCalled();
    expect(createObj.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(revokeObj).toHaveBeenCalledWith('blob:url');
  });

  it('throws when useSettings used outside provider', () => {
    function Bad() { useSettings(); return null; }
    expect(() => render(<Bad />)).toThrow('useSettings must be used within');
  });

  it('useSetting hook returns specific setting by dot path', async () => {
    function SettingTest() {
      const gymName = useSetting('general.gymName');
      const trialDays = useSetting('membership.trialPeriodDays');
      const missing = useSetting('nonexistent.key');
      return (
        <div>
          <div data-testid="gym">{gymName}</div>
          <div data-testid="trial">{trialDays}</div>
          <div data-testid="missing">{missing === null ? 'null' : missing}</div>
        </div>
      );
    }
    settingsApi.getAll.mockResolvedValue({});
    settingsApi.getLocations.mockResolvedValue([]);
    render(
      <NotificationProvider>
        <SettingsProvider><SettingTest /></SettingsProvider>
      </NotificationProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('gym')).toHaveTextContent('ROAR MMA');
    });
    expect(screen.getByTestId('trial')).toHaveTextContent('7');
    expect(screen.getByTestId('missing')).toHaveTextContent('null');
  });

  it('useFeature hook returns feature flag value', async () => {
    function FeatureTest() {
      const booking = useFeature('onlineBooking');
      const loyalty = useFeature('loyaltyPoints');
      const missing = useFeature('nonexistent');
      return (
        <div>
          <div data-testid="booking">{booking.toString()}</div>
          <div data-testid="loyalty">{loyalty.toString()}</div>
          <div data-testid="missing">{missing.toString()}</div>
        </div>
      );
    }
    settingsApi.getAll.mockResolvedValue({});
    settingsApi.getLocations.mockResolvedValue([]);
    render(
      <NotificationProvider>
        <SettingsProvider><FeatureTest /></SettingsProvider>
      </NotificationProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('booking')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('loyalty')).toHaveTextContent('false');
    expect(screen.getByTestId('missing')).toHaveTextContent('false');
  });
});
