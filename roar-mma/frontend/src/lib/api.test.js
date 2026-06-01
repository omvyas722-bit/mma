import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { settingsApi } from './api';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        defaults: { headers: { common: {} } },
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      return instance;
    }),
  },
}));

describe('api module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('axios.create was called with base URL', () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: expect.stringMatching(/^http/),
      })
    );
  });

  it('request interceptor was registered', () => {
    expect(api.interceptors.request.use).toHaveBeenCalled();
  });

  it('response interceptor was registered', () => {
    expect(api.interceptors.response.use).toHaveBeenCalled();
  });

  it('request interceptor adds token from localStorage', () => {
    const handler = api.interceptors.request.use.mock.calls[0][0];
    localStorage.setItem('token', 'my-token');
    const config = handler({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer my-token');
  });

  it('request interceptor skips header when no token', () => {
    const handler = api.interceptors.request.use.mock.calls[0][0];
    const config = handler({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('response interceptor passes through success', () => {
    const handler = api.interceptors.response.use.mock.calls[0][0];
    const response = { data: 'ok' };
    expect(handler(response)).toBe(response);
  });

  it('response error interceptor clears token on 401', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    localStorage.setItem('token', 'bad-token');
    const error = { response: { status: 401 } };
    await expect(errorHandler(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('response error interceptor passes through non-401 errors', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    const error = { response: { status: 500 }, message: 'Server error' };
    await expect(errorHandler(error)).rejects.toBe(error);
  });
});

describe('settingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls api.get with /api/settings', () => {
    settingsApi.getAll({ signal: null });
    expect(api.get).toHaveBeenCalledWith('/api/settings', { signal: null });
  });

  it('update calls api.put with /api/settings', () => {
    settingsApi.update({ gymName: 'Test' });
    expect(api.put).toHaveBeenCalledWith('/api/settings', { gymName: 'Test' });
  });

  it('getLocations calls api.get with /api/settings/locations', () => {
    settingsApi.getLocations();
    expect(api.get.mock.calls[0][0]).toBe('/api/settings/locations');
  });

  it('createLocation calls api.post', () => {
    settingsApi.createLocation({ name: 'New' });
    expect(api.post).toHaveBeenCalledWith('/api/settings/locations', { name: 'New' });
  });

  it('updateLocation calls api.put with id', () => {
    settingsApi.updateLocation(5, { name: 'Updated' });
    expect(api.put).toHaveBeenCalledWith('/api/settings/locations/5', { name: 'Updated' });
  });

  it('deleteLocation calls api.delete with id', () => {
    settingsApi.deleteLocation(3);
    expect(api.delete.mock.calls[0][0]).toBe('/api/settings/locations/3');
  });

  it('testEmailConfig calls api.post', () => {
    settingsApi.testEmailConfig({ apiKey: 'key' });
    expect(api.post).toHaveBeenCalledWith('/api/settings/test-email', { apiKey: 'key' });
  });

  it('testSMSConfig calls api.post', () => {
    settingsApi.testSMSConfig({ accountSid: 'sid' });
    expect(api.post).toHaveBeenCalledWith('/api/settings/test-sms', { accountSid: 'sid' });
  });
});
