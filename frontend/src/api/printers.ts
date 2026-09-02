import api from './client';
import { PrintJob } from './jobs';

export interface CampusPrinter {
  id: string;
  name: string;
  model: string;
  location: string;
  host: string;
  port: number;
  protocol: string;
  supports_color: boolean;
  is_default: boolean;
  is_online?: boolean;
}

export interface NetworkSpoolRequest {
  printer_id: string;
  department_code?: string;
  pin_code?: string;
  color_mode?: 'bw' | 'color';
  page_count?: number;
  copies?: number;
  purge_file?: boolean;
}

export interface NetworkSpoolResponse {
  success: boolean;
  message: string;
  printer_name: string;
  printer_host: string;
  spooled_bytes: number;
  department_code_used?: string;
  via_relay?: boolean;
  job: PrintJob;
}

export interface RelayStatusResponse {
  is_relay_active: boolean;
  last_heartbeat: string | null;
  agent_name: string;
  printer_host: string;
  printer_online: boolean;
  pending_queue_count: number;
}

export const printersApi = {
  list: async (): Promise<CampusPrinter[]> => {
    const res = await api.get('/api/printers');
    return res.data;
  },

  getRelayStatus: async (): Promise<RelayStatusResponse> => {
    const res = await api.get('/api/relay/status');
    return res.data;
  },

  spoolJob: async (jobId: string, payload: NetworkSpoolRequest): Promise<NetworkSpoolResponse> => {
    const res = await api.post(`/api/printers/spool/${jobId}`, payload);
    return res.data;
  },
};
