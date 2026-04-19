import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kingsmode_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('kingsmode_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register:       (data: { name: string; email: string; password: string }) => api.post('/auth/register', data),
  login:          (data: { email: string; password: string })               => api.post('/auth/login', data),
  getMe:          ()                                                         => api.get('/auth/me'),
  me:             (token: string)                                            => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
  updateProfile:  (data: { name?: string; email?: string })                 => api.patch('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string })  => api.patch('/auth/password', data),
  deleteAccount:  (data: { password: string })                              => api.delete('/auth/account', { data }),
};

export const tasksApi = {
  getAll:  ()                                                                     => api.get('/tasks'),
  create:  (data: { title: string; priority: string; due_datetime?: string; recurrence?: string; tags?: string[] }) => api.post('/tasks', data),
  update:  (id: string, data: Partial<{ title: string; completed: boolean; priority: string; due_datetime: string; subtasks: object[]; recurrence: string; tags: string[] }>) => api.patch(`/tasks/${id}`, data),
  remove:  (id: string)                                                            => api.delete(`/tasks/${id}`),
};

export const sessionsApi = {
  start:     (type: string, duration: number) => api.post('/sessions/start', { type, duration }),
  complete:  (sessionId: string, notes?: string) => api.post(`/sessions/${sessionId}/complete`, { notes }),
  today:     ()                               => api.get('/sessions/today'),
  analytics: ()                               => api.get('/sessions/analytics'),
  history:   ()                               => api.get('/sessions/history'),
};

export default api;
