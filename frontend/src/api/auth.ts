import api from './client';

export interface User {
  id: string;
  email: string;
  created_at: string;
  has_printing_code: boolean;
  is_superadmin?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  },

  register: async (email: string, password: string, confirm_password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/register', { email, password, confirm_password });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },

  getGoogleConfig: async (): Promise<{ client_id: string | null }> => {
    try {
      const res = await api.get('/api/auth/google/config');
      return res.data;
    } catch {
      return { client_id: null };
    }
  },

  googleLogin: async (id_token: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/google', { id_token });
    return res.data;
  },
};
