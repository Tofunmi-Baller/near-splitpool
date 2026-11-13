const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

// Pools
export const fetchPools = (account?: string) => {
  const qs = account ? `?account=${account}` : '';
  return request<any[]>(`/pools${qs}`);
};
export const fetchPool = (id: string) => request<any>(`/pools/${id}`);
export const createPool = (data: {
  name: string;
  description?: string;
  creator: string;
}) =>
  request<any>('/pools', {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const seedDemo = () =>
  request<any>('/seed', { method: 'POST' });

// Members
export const addMember = (
  poolId: string,
  data: { nearAccount: string; displayName: string }
) =>
  request<any>(`/pools/${poolId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Deposits
export const deposit = (
  poolId: string,
  data: { nearAccount: string; amount: number; token: string }
) =>
  request<any>(`/pools/${poolId}/deposit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Spend requests
export const createSpendRequest = (
  poolId: string,
  data: {
    requestedBy: string;
    amount: number;
    description: string;
    category: string;
  }
) =>
  request<any>(`/pools/${poolId}/spend-requests`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const fetchSpendRequests = (poolId: string, status?: string) => {
  const qs = status ? `?status=${status}` : '';
  return request<any[]>(`/pools/${poolId}/spend-requests${qs}`);
};

export const voteOnRequest = (
  poolId: string,
  reqId: string,
  data: { voter: string; decision: string }
) =>
  request<any>(`/pools/${poolId}/spend-requests/${reqId}/vote`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Rules
export const fetchRules = (poolId: string) =>
  request<any[]>(`/pools/${poolId}/rules`);

export const updateRules = (poolId: string, rules: any[]) =>
  request<any>(`/pools/${poolId}/rules`, {
    method: 'PUT',
    body: JSON.stringify(rules),
  });

// Settlement
export const fetchSettlement = (poolId: string) =>
  request<any>(`/pools/${poolId}/settle`);

export const executeSettlement = (poolId: string) =>
  request<any>(`/pools/${poolId}/settle/execute`, {
    method: 'POST',
  });

// Ledger
export const fetchLedger = (
  poolId: string,
  filters?: { member?: string; category?: string; type?: string }
) => {
  const params = new URLSearchParams();
  if (filters?.member) params.set('member', filters.member);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.type) params.set('type', filters.type);
  const qs = params.toString();
  return request<any[]>(`/pools/${poolId}/ledger${qs ? `?${qs}` : ''}`);
};
