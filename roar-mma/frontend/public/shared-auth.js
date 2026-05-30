// Shared authentication module for all HTML pages
(function() {
  'use strict';
  
  const AUTH_TOKEN_KEY = 'roar_mma_token';
  const API_BASE = 'http://localhost:3001/api';
  
  // Expose API_BASE globally for pages that reference ROAR_API_BASE
  window.ROAR_API_BASE = API_BASE;
  
  function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  
  function setToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  
  function clearToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
  
  function isAuthenticated() {
    return !!getToken();
  }
  
  async function login(email, password) {
    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setToken(data.token);
    return data;
  }
  
  function logout() {
    clearToken();
    window.location.href = '/login.html';
  }
  
  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }
  
  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(API_BASE + path, { ...options, headers });
    if (res.status === 401) {
      clearToken();
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }
    return res;
  }
  
  async function apiGet(path) {
    const res = await apiFetch(path);
    return res.json();
  }
  
  async function apiPost(path, body) {
    const res = await apiFetch(path, { 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
    return res.json();
  }
  
  async function apiPut(path, body) {
    const res = await apiFetch(path, { 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
    return res.json();
  }
  
  async function apiDelete(path) {
    const res = await apiFetch(path, { method: 'DELETE' });
    return res.json();
  }
  
  window.RoarMMA = {
    API_BASE: API_BASE,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    isAuthenticated: isAuthenticated,
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    apiFetch: apiFetch,
    apiGet: apiGet,
    apiPost: apiPost,
    apiPut: apiPut,
    apiDelete: apiDelete
  };
  
})();
