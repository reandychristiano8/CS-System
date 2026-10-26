import { User, Task, Stats, DemoAccount } from '../types';

const TOKEN_KEY = 'cleandesk_session_token';

export const sessionManager = {
  getToken: (): string | null => {
    return sessionStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string): void => {
    sessionStorage.setItem(TOKEN_KEY, token);
  },
  clearToken: (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
  },
  hasToken: (): boolean => {
    return Boolean(sessionStorage.getItem(TOKEN_KEY));
  },
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = sessionManager.getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: Terjadi kesalahan.`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    sessionManager.setToken(res.token);
    return res;
  },

  getMe: async (): Promise<{ user: User; sessionTokenPrefix: string }> => {
    return request<{ user: User; sessionTokenPrefix: string }>('/api/auth/me');
  },

  logout: async (): Promise<void> => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      sessionManager.clearToken();
    }
  },

  getDemoAccounts: async (): Promise<DemoAccount[]> => {
    const res = await request<{ accounts: DemoAccount[] }>('/api/auth/demo-accounts');
    return res.accounts;
  },

  // Tasks
  getTasks: async (filters?: {
    userId?: number | string;
    tanggal?: string;
    status?: string;
    search?: string;
  }): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters?.userId && filters.userId !== 'all') params.append('userId', String(filters.userId));
    if (filters?.tanggal && filters.tanggal !== 'all') params.append('tanggal', filters.tanggal);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request<{ tasks: Task[] }>(`/api/tasks${query}`);
    return res.tasks;
  },

  createTask: async (nama_pekerjaan: string, tanggal: string): Promise<Task> => {
    const res = await request<{ task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ nama_pekerjaan, tanggal }),
    });
    return res.task;
  },

  completeTask: async (
    taskId: number,
    formData: FormData
  ): Promise<Task> => {
    const res = await request<{ task: Task }>(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
      body: formData,
    });
    return res.task;
  },

  deleteTask: async (taskId: number): Promise<void> => {
    await request(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await request<{ users: User[] }>('/api/users');
    return res.users;
  },

  createUser: async (data: {
    username: string;
    passwordPlain: string;
    role: 'supervisor' | 'staff';
    nama_lengkap: string;
  }): Promise<User> => {
    const res = await request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: data.username,
        password: data.passwordPlain,
        role: data.role,
        nama_lengkap: data.nama_lengkap,
      }),
    });
    return res.user;
  },

  // Stats
  getStats: async (): Promise<Stats> => {
    return request<Stats>('/api/stats');
  },
};
