import api from './client';

export interface CodeResponse {
  code: string;
}

export const codeApi = {
  get: async (): Promise<CodeResponse> => {
    const res = await api.get('/api/code');
    return res.data;
  },

  save: async (printing_code: string): Promise<CodeResponse> => {
    const res = await api.post('/api/code', { printing_code });
    return res.data;
  },
};
