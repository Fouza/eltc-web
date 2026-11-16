import { getToken } from '@helpers/auth';

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const toQuery = (params) => {
  if (!params) return '';
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false));
  const s = q.toString();
  return s ? `?${s}` : '';
};

// Throws ApiError on any non-2xx (fixes Rangewell's fetchApi that returned errors as data).
const request = async (method, url, { body, params, signal } = {}) => {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${url}${toQuery(params)}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data?.errorMessage ?? res.statusText, data?.details);
  }
  return data;
};

export const api = {
  get: (url, params, opts) => request('GET', url, { params, ...opts }),
  post: (url, body) => request('POST', url, { body: body ?? {} }),
  put: (url, body) => request('PUT', url, { body: body ?? {} }),
  delete: (url) => request('DELETE', url),
};
