import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PrintJob, jobsApi } from '../api/jobs';
import { StatsResponse, statsApi } from '../api/stats';
import { codeApi } from '../api/code';
import { useAuth } from './AuthContext';

interface DataContextType {
  jobs: PrintJob[];
  stats: StatsResponse | null;
  printingCode: string;
  initialLoaded: boolean;
  refreshDashboard: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshCode: () => Promise<void>;
  addJob: (job: PrintJob) => void;
  removeJob: (id: string) => void;
  setPrintingCodeLocal: (code: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [printingCode, setPrintingCode] = useState<string>('');
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);

  const refreshDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const [jobsRes, statsRes, codeRes] = await Promise.allSettled([
        jobsApi.list(),
        statsApi.get(),
        codeApi.get(),
      ]);

      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (codeRes.status === 'fulfilled') setPrintingCode(codeRes.value.code);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    } finally {
      setInitialLoaded(true);
    }
  }, [user]);

  const refreshStats = useCallback(async () => {
    try {
      const data = await statsApi.get();
      setStats(data);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, []);

  const refreshCode = useCallback(async () => {
    try {
      const data = await codeApi.get();
      setPrintingCode(data.code);
    } catch (err) {
      console.error('Error refreshing code:', err);
    }
  }, []);

  const addJob = useCallback((job: PrintJob) => {
    setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
    refreshStats();
  }, [refreshStats]);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    refreshStats();
  }, [refreshStats]);

  const setPrintingCodeLocal = useCallback((code: string) => {
    setPrintingCode(code);
  }, []);

  // Preload data on user login
  useEffect(() => {
    if (user) {
      refreshDashboard();
    } else {
      setJobs([]);
      setStats(null);
      setPrintingCode('');
      setInitialLoaded(false);
    }
  }, [user, refreshDashboard]);

  return (
    <DataContext.Provider
      value={{
        jobs,
        stats,
        printingCode,
        initialLoaded,
        refreshDashboard,
        refreshStats,
        refreshCode,
        addJob,
        removeJob,
        setPrintingCodeLocal,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a DataProvider');
  }
  return ctx;
};
