// Settings Context Provider - Application settings management

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../lib/api';
import { useNotifications } from './NotificationContext';
import logger from '../lib/logger';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  general: {
    gymName: 'ROAR MMA',
    email: '',
    phone: '',
    address: '',
    timezone: 'Australia/Perth',
    currency: 'AUD',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  business: {
    businessHoursStart: '06:00',
    businessHoursEnd: '22:00',
    bookingInterval: 30,
    cancellationPolicy: 24,
    lateArrivalGrace: 15,
  },
  membership: {
    trialPeriodDays: 7,
    autoRenewal: true,
    gracePeriodDays: 3,
    freezeMaxDays: 30,
    freezeAllowedPerYear: 2,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    classReminders: true,
    classReminderHours: 2,
    paymentReminders: true,
    paymentReminderDays: 3,
    birthdayMessages: true,
    membershipExpiry: true,
    membershipExpiryDays: 7,
  },
  integrations: {
    stripeEnabled: false,
    stripePublicKey: '',
    stripeSecretKey: '',
    sendgridEnabled: false,
    sendgridApiKey: '',
    sendgridFromEmail: '',
    twilioEnabled: false,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
  },
  features: {
    onlineBooking: true,
    memberPortal: true,
    waitlist: true,
    guestPasses: true,
    referralProgram: true,
    loyaltyPoints: false,
  },
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useNotifications();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadLocations();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsApi.getAll();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
      logger.info('Settings loaded');
    } catch (err) {
      logger.error('Failed to load settings', err);
      error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const data = await settingsApi.getLocations();
      setLocations(data);
      logger.info('Locations loaded', { count: data.length });
    } catch (err) {
      logger.error('Failed to load locations', err);
    }
  };

  // Update settings
  const updateSettings = useCallback(async (updates) => {
    setIsSaving(true);

    try {
      const updatedSettings = { ...settings, ...updates };
      await settingsApi.update(updatedSettings);
      setSettings(updatedSettings);
      success('Settings saved successfully');
      logger.info('Settings updated', { updates });
      return { success: true };
    } catch (err) {
      logger.error('Failed to update settings', err);
      error('Failed to save settings');
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [settings, success, error]);

  // Update specific section
  const updateSection = useCallback(async (section, updates) => {
    const sectionUpdates = {
      [section]: {
        ...settings[section],
        ...updates,
      },
    };
    return updateSettings(sectionUpdates);
  }, [settings, updateSettings]);

  // Get setting value
  const getSetting = useCallback((path) => {
    const keys = path.split('.');
    let value = settings;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return null;
    }

    return value;
  }, [settings]);

  // Location management
  const addLocation = useCallback(async (locationData) => {
    try {
      const newLocation = await settingsApi.createLocation(locationData);
      setLocations((prev) => [...prev, newLocation]);
      success('Location added successfully');
      logger.info('Location added', { locationId: newLocation.id });
      return { success: true, location: newLocation };
    } catch (err) {
      logger.error('Failed to add location', err);
      error('Failed to add location');
      return { success: false, error: err.message };
    }
  }, [success, error]);

  const updateLocation = useCallback(async (id, updates) => {
    try {
      const updatedLocation = await settingsApi.updateLocation(id, updates);
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? updatedLocation : loc))
      );
      success('Location updated successfully');
      logger.info('Location updated', { locationId: id });
      return { success: true, location: updatedLocation };
    } catch (err) {
      logger.error('Failed to update location', err);
      error('Failed to update location');
      return { success: false, error: err.message };
    }
  }, [success, error]);

  const deleteLocation = useCallback(async (id) => {
    try {
      await settingsApi.deleteLocation(id);
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      success('Location deleted successfully');
      logger.info('Location deleted', { locationId: id });
      return { success: true };
    } catch (err) {
      logger.error('Failed to delete location', err);
      error('Failed to delete location');
      return { success: false, error: err.message };
    }
  }, [success, error]);

  // Test integrations
  const testEmailConfig = useCallback(async (config) => {
    try {
      await settingsApi.testEmailConfig(config);
      success('Email configuration is working correctly');
      return { success: true };
    } catch (err) {
      error('Email configuration test failed');
      return { success: false, error: err.message };
    }
  }, [success, error]);

  const testSMSConfig = useCallback(async (config) => {
    try {
      await settingsApi.testSMSConfig(config);
      success('SMS configuration is working correctly');
      return { success: true };
    } catch (err) {
      error('SMS configuration test failed');
      return { success: false, error: err.message };
    }
  }, [success, error]);

  // Reset settings to defaults
  const resetSettings = useCallback(async () => {
    try {
      await settingsApi.update(DEFAULT_SETTINGS);
      setSettings(DEFAULT_SETTINGS);
      success('Settings reset to defaults');
      logger.info('Settings reset to defaults');
      return { success: true };
    } catch (err) {
      logger.error('Failed to reset settings', err);
      error('Failed to reset settings');
      return { success: false, error: err.message };
    }
  }, [success, error]);

  // Export settings
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    success('Settings exported successfully');
  }, [settings, success]);

  // Import settings
  const importSettings = useCallback(async (file) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      await updateSettings(importedSettings);
      success('Settings imported successfully');
      return { success: true };
    } catch (err) {
      logger.error('Failed to import settings', err);
      error('Failed to import settings');
      return { success: false, error: err.message };
    }
  }, [updateSettings, success, error]);

  const value = {
    settings,
    locations,
    isLoading,
    isSaving,
    updateSettings,
    updateSection,
    getSetting,
    addLocation,
    updateLocation,
    deleteLocation,
    testEmailConfig,
    testSMSConfig,
    resetSettings,
    exportSettings,
    importSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}

// Hook to get specific setting
export function useSetting(path) {
  const { getSetting } = useSettings();
  return getSetting(path);
}

// Hook to check if feature is enabled
export function useFeature(featureName) {
  const { settings } = useSettings();
  return settings.features?.[featureName] ?? false;
}

export default SettingsContext;

// Usage examples:
/*
// Wrap app with SettingsProvider
import { SettingsProvider } from './contexts/SettingsContext';

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

// Use settings in components
import { useSettings } from './contexts/SettingsContext';

function SettingsPage() {
  const { settings, updateSection, isSaving } = useSettings();

  const handleSave = async () => {
    await updateSection('general', {
      gymName: 'New Gym Name',
      email: 'info@newgym.com',
    });
  };

  return (
    <div>
      <h1>{settings.general.gymName}</h1>
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

// Get specific setting
import { useSetting } from './contexts/SettingsContext';

function Header() {
  const gymName = useSetting('general.gymName');
  const timezone = useSetting('general.timezone');

  return <h1>{gymName}</h1>;
}

// Check feature flag
import { useFeature } from './contexts/SettingsContext';

function BookingButton() {
  const onlineBookingEnabled = useFeature('onlineBooking');

  if (!onlineBookingEnabled) {
    return null;
  }

  return <button>Book Class</button>;
}

// Location management
const { locations, addLocation, updateLocation, deleteLocation } = useSettings();

// Add location
await addLocation({
  name: 'Burleigh Heads',
  address: '123 Main St',
  phone: '0412345678',
});

// Update location
await updateLocation(locationId, {
  name: 'Updated Name',
});

// Delete location
await deleteLocation(locationId);

// Test integrations
const { testEmailConfig, testSMSConfig } = useSettings();

await testEmailConfig({
  apiKey: 'sg.xxx',
  fromEmail: 'test@example.com',
});

await testSMSConfig({
  accountSid: 'ACxxx',
  authToken: 'xxx',
  phoneNumber: '+61412345678',
});

// Export/Import settings
const { exportSettings, importSettings } = useSettings();

// Export
exportSettings();

// Import
const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  await importSettings(file);
};

// Reset to defaults
const { resetSettings } = useSettings();
await resetSettings();
*/
