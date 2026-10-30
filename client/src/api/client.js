const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : '/api/v1';

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function queryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? 'The request could not be completed.', {
      status: response.status,
      code: payload?.error?.code,
      details: payload?.error?.details,
    });
  }

  return payload;
}

export const api = {
  customers: {
    list: (params, signal) => request(`/customers${queryString(params)}`, { signal }),
    get: (id, signal) => request(`/customers/${id}`, { signal }),
    create: (body) => request('/customers', { method: 'POST', body }),
    update: (id, body) => request(`/customers/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: (params, signal) => request(`/products${queryString(params)}`, { signal }),
    get: (id, signal) => request(`/products/${id}`, { signal }),
    create: (body) => request('/products', { method: 'POST', body }),
    update: (id, body) => request(`/products/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: (params, signal) => request(`/orders${queryString(params)}`, { signal }),
    get: (id, signal) => request(`/orders/${id}`, { signal }),
    create: (body) => request('/orders', { method: 'POST', body }),
    update: (id, body) => request(`/orders/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    summary: (signal) => request('/dashboard/summary', { signal }),
    ordersByStatus: (signal) => request('/dashboard/orders-by-status', { signal }),
    productsByCategory: (signal) => request('/dashboard/products-by-category', { signal }),
    monthlyRevenue: (months = 12, signal) =>
      request(`/dashboard/monthly-revenue${queryString({ months })}`, { signal }),
    topProducts: (limit = 5, signal) =>
      request(`/dashboard/top-products${queryString({ limit })}`, { signal }),
    recentOrders: (limit = 5, signal) =>
      request(`/dashboard/recent-orders${queryString({ limit })}`, { signal }),
  },
};
