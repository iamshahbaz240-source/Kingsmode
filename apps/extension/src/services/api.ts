const BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:5000/api';

// chrome.storage.local is async — wrap it
const getToken = (): Promise<string | null> =>
  new Promise((res) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { res(null); return; }
    chrome.storage.local.get('km_token', (r) => res(r.km_token ?? null));
  });

const setToken = (token: string): Promise<void> =>
  new Promise((res) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { res(); return; }
    chrome.storage.local.set({ km_token: token }, res);
  });

const clearToken = (): Promise<void> =>
  new Promise((res) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { res(); return; }
    chrome.storage.local.remove('km_token', res);
  });

const request = async (method: string, path: string, body?: object) => {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const extApi = {
  login: async (email: string, password: string) => {
    const data = await request('POST', '/auth/login', { email, password });
    const token = data.data?.token;
    if (token) await setToken(token);
    return data.data?.user;
  },
  logout: clearToken,
  getToken,

  getTasks: ()                                                            => request('GET',    '/tasks'),
  createTask: (title: string, priority: string, due_datetime?: string)   => request('POST',   '/tasks', { title, priority, due_datetime }),
  updateTask: (id: string, patch: object)                                 => request('PATCH',  `/tasks/${id}`, patch),
  deleteTask: (id: string)                                                => request('DELETE', `/tasks/${id}`),
};
