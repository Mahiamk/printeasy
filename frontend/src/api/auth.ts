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
  user?: User;
}

export interface MessageResponse {
  message: string;
}

export interface QRInitiateResponse {
  token: string;
  expires_at: string;
  expires_in_seconds: number;
  device_info?: string;
}

export interface QRStatusResponse {
  status: 'pending' | 'approved' | 'consumed' | 'expired' | 'rejected';
  access_token?: string;
  user?: User;
  device_info?: string;
}

export interface QRInfoResponse {
  token: string;
  status: string;
  device_info?: string;
  created_at: string;
  expires_at: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  },

  register: async (email: string, password: string, confirm_password: string): Promise<MessageResponse> => {
    const res = await api.post('/api/auth/register', { email, password, confirm_password });
    return res.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string; verified?: boolean; already_verified?: boolean }> => {
    const res = await api.get(`/api/auth/verify?token=${token}`);
    return res.data;
  },

  resendVerification: async (email: string, password: string): Promise<MessageResponse> => {
    const res = await api.post('/api/auth/resend-verification', { email, password });
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

  qrInitiate: async (device_info?: string): Promise<QRInitiateResponse> => {
    const res = await api.post('/api/auth/qr/initiate', { device_info });
    return res.data;
  },

  qrCheckStatus: async (token: string): Promise<QRStatusResponse> => {
    const res = await api.get(`/api/auth/qr/status/${encodeURIComponent(token)}`);
    return res.data;
  },

  qrGetInfo: async (token: string): Promise<QRInfoResponse> => {
    const res = await api.get(`/api/auth/qr/info/${encodeURIComponent(token)}`);
    return res.data;
  },

  qrAuthorize: async (token: string, action: 'approve' | 'reject' = 'approve'): Promise<{ status: string; message: string }> => {
    const res = await api.post('/api/auth/qr/authorize', { token, action });
    return res.data;
  },
};

