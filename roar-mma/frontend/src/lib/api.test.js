import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, {
  membersApi, communicationsApi, authApi, leadsApi, classesApi,
  paymentsApi, coachingApi, notificationsApi, settingsApi, calendarApi,
} from './api';
import axios from 'axios';

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        patch: vi.fn(() => Promise.resolve({ data: {} })),
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

describe('api instance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('axios.create was called with a base URL', () => {
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
    const response = { data: 'ok', headers: { 'content-type': 'application/json' }, config: { method: 'GET', url: '/test' } };
    expect(handler(response)).toBe(response);
  });

  it('response error interceptor clears token on 401 and redirects', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    localStorage.setItem('token', 'bad-token');
    const error = { response: { status: 401 }, config: {} };
    await expect(errorHandler(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('response error interceptor sets _retry to prevent loop', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    const config = {};
    const error = { response: { status: 401 }, config };
    await expect(errorHandler(error)).rejects.toBe(error);
    expect(config._retry).toBe(true);
  });

  it('response error interceptor passes through non-401 errors', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    const error = { response: { status: 500 }, message: 'Server error', config: {} };
    await expect(errorHandler(error)).rejects.toBe(error);
  });

  it('response error interceptor rejects on network error', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    const error = { message: 'Network Error', config: {} };
    const result = await errorHandler(error).catch(e => e);
    expect(result.message).toMatch(/connection/i);
  });

  it('response error interceptor adds permission message on 403', async () => {
    const errorHandler = api.interceptors.response.use.mock.calls[0][1];
    const error = { response: { status: 403 }, config: {} };
    const result = await errorHandler(error).catch(e => e);
    expect(result.message).toMatch(/permission/i);
  });
});

describe('authApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login POST /api/auth/login', () => {
    authApi.login({ email: 'a@b.com', password: 'p' });
    expect(api.post).toHaveBeenCalledWith('/api/auth/login', { email: 'a@b.com', password: 'p' }, {});
  });

  it('logout POST /api/auth/logout', () => {
    authApi.logout();
    expect(api.post).toHaveBeenCalledWith('/api/auth/logout', undefined, {});
  });

  it('getCurrentUser GET /api/auth/me', () => {
    authApi.getCurrentUser();
    expect(api.get).toHaveBeenCalledWith('/api/auth/me', {});
  });
});

describe('membersApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll GET /api/members with params', () => {
    membersApi.getAll({ page: 1, limit: 20 });
    expect(api.get).toHaveBeenCalledWith('/api/members', { params: { page: 1, limit: 20 } });
  });

  it('getById GET /api/members/:id', () => {
    membersApi.getById(42);
    expect(api.get).toHaveBeenCalledWith('/api/members/42', {});
  });

  it('create POST /api/members', () => {
    membersApi.create({ name: 'John' });
    expect(api.post).toHaveBeenCalledWith('/api/members', { name: 'John' }, {});
  });

  it('update PUT /api/members/:id', () => {
    membersApi.update(1, { name: 'Jane' });
    expect(api.put).toHaveBeenCalledWith('/api/members/1', { name: 'Jane' }, {});
  });

  it('delete DELETE /api/members/:id', () => {
    membersApi.delete(5);
    expect(api.delete).toHaveBeenCalledWith('/api/members/5', {});
  });

  it('bulkDelete POST /api/members/bulk-delete', () => {
    membersApi.bulkDelete([1, 2]);
    expect(api.post).toHaveBeenCalledWith('/api/members/bulk-delete', { ids: [1, 2] }, {});
  });

  it('search GET /api/members/search', () => {
    membersApi.search('John');
    expect(api.get).toHaveBeenCalledWith('/api/members/search', { params: { q: 'John' } });
  });
});

describe('communicationsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll GET /api/communications', () => {
    communicationsApi.getAll({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/api/communications', { params: { page: 1 } });
  });

  it('sendEmail POST /api/communications/email', () => {
    communicationsApi.sendEmail({ to: 'a@b.com', subject: 'Hi' });
    expect(api.post).toHaveBeenCalledWith('/api/communications/email', { to: 'a@b.com', subject: 'Hi' }, {});
  });

  it('sendSMS POST /api/communications/sms', () => {
    communicationsApi.sendSMS({ to: '0412345678', body: 'Test' });
    expect(api.post).toHaveBeenCalledWith('/api/communications/sms', { to: '0412345678', body: 'Test' }, {});
  });

  it('getTemplates GET /api/communications/templates', () => {
    communicationsApi.getTemplates();
    expect(api.get).toHaveBeenCalledWith('/api/communications/templates', {});
  });

  it('scheduleMessage POST /api/communications/schedule', () => {
    communicationsApi.scheduleMessage({ when: '2025-01-01', message: 'Hi' });
    expect(api.post).toHaveBeenCalledWith('/api/communications/schedule', { when: '2025-01-01', message: 'Hi' }, {});
  });
});

describe('leadsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll GET /api/leads', () => {
    leadsApi.getAll({ status: 'new' });
    expect(api.get).toHaveBeenCalledWith('/api/leads', { params: { status: 'new' } });
  });

  it('convertToMember POST /api/leads/:id/convert', () => {
    leadsApi.convertToMember(1, { membershipType: 'monthly' });
    expect(api.post).toHaveBeenCalledWith('/api/leads/1/convert', { membershipType: 'monthly' }, {});
  });
});

describe('classesApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll GET /api/classes', () => {
    classesApi.getAll({ day: 'Monday' });
    expect(api.get).toHaveBeenCalledWith('/api/classes', { params: { day: 'Monday' } });
  });

  it('checkIn POST /api/classes/instances/:id/check-in', () => {
    classesApi.checkIn(10, 5);
    expect(api.post).toHaveBeenCalledWith('/api/classes/instances/10/check-in', { memberId: 5 }, {});
  });
});

describe('paymentsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll GET /api/transactions', () => {
    paymentsApi.getAll({ status: 'completed' });
    expect(api.get).toHaveBeenCalledWith('/api/transactions', { params: { status: 'completed' } });
  });

  it('refund POST /api/transactions/:id/refund', () => {
    paymentsApi.refund(1, 50, 'Customer request');
    expect(api.post).toHaveBeenCalledWith('/api/transactions/1/refund', { amount: 50, reason: 'Customer request' }, {});
  });
});

describe('coachingApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAllRatings GET /api/coaching/ratings', () => {
    coachingApi.getAllRatings({ page: 1 });
    expect(api.get).toHaveBeenCalledWith('/api/coaching/ratings', { params: { page: 1 } });
  });

  it('createRating POST /api/coaching/:id/ratings', () => {
    coachingApi.createRating(1, { defense: 8 });
    expect(api.post).toHaveBeenCalledWith('/api/coaching/1/ratings', { defense: 8 }, {});
  });
});

describe('notificationsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll GET /api/notifications', () => {
    notificationsApi.getAll({ unread: true });
    expect(api.get).toHaveBeenCalledWith('/api/notifications', { params: { unread: true } });
  });

  it('markAsRead PUT /api/notifications/:id/read', () => {
    notificationsApi.markAsRead(5);
    expect(api.put).toHaveBeenCalledWith('/api/notifications/5/read', undefined, {});
  });
});

describe('settingsApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAll calls api.get with /api/settings', () => {
    settingsApi.getAll({ signal: null });
    expect(api.get).toHaveBeenCalledWith('/api/settings', { signal: null });
  });

  it('update calls api.put with /api/settings', () => {
    settingsApi.update({ gymName: 'Test' });
    expect(api.put.mock.calls[0]).toEqual(['/api/settings', { gymName: 'Test' }, expect.any(Object)]);
  });

  it('getLocations calls api.get with /api/settings/locations', () => {
    settingsApi.getLocations();
    expect(api.get.mock.calls[0][0]).toBe('/api/settings/locations');
  });

  it('createLocation calls api.post', () => {
    settingsApi.createLocation({ name: 'New' });
    expect(api.post.mock.calls[0]).toEqual(['/api/settings/locations', { name: 'New' }, expect.any(Object)]);
  });
});

describe('calendarApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getEvents GET /api/calendar/events', () => {
    calendarApi.getEvents({ month: 1 });
    expect(api.get).toHaveBeenCalledWith('/api/calendar/events', { params: { month: 1 } });
  });

  it('createEvent POST /api/calendar/events', () => {
    calendarApi.createEvent({ title: 'Event' });
    expect(api.post).toHaveBeenCalledWith('/api/calendar/events', { title: 'Event' }, {});
  });
});
