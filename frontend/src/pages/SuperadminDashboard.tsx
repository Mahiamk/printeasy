import React, { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  superadminApi,
  SuperadminStats,
  PrintTrendPoint,
  AdminUserItem,
} from '../api/superadmin';
import { MultiLineTrendChart } from '../components/charts/MultiLineTrendChart';
import {
  Users,
  Printer,
  Clock,
  FileText,
  HardDrives,
  ShieldCheck,
  MagnifyingGlass,
  ArrowClockwise,
  Spinner,
  Palette,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react';

export const SuperadminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SuperadminStats | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [trendsData, setTrendsData] = useState<PrintTrendPoint[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await superadminApi.getStats();
      setStats(res);
    } catch (err) {
      console.error('Failed to load superadmin stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTrends = async (selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    setLoadingTrends(true);
    try {
      const res = await superadminApi.getTrends(selectedPeriod);
      setTrendsData(res.data);
    } catch (err) {
      console.error('Failed to load superadmin trends', err);
    } finally {
      setLoadingTrends(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await superadminApi.getUsers();
      setUsers(res);
    } catch (err) {
      console.error('Failed to load superadmin users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      fetchStats(),
      fetchTrends(period),
      fetchUsers(),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTrends(period);
  }, [period]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, searchQuery]);

  const totalPagesPrinted = (stats?.total_bw_pages_printed || 0) + (stats?.total_color_pages_printed || 0);

  return (
    <AppLayout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} weight="duotone" color="var(--accent-sage)" />
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Superadmin Command Center
              </h2>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              System-wide printer analytics, Color vs. B&W print volume, and user quota management
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ArrowClockwise size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* 5-Card System KPI Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {/* Total Registered Users */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(92, 169, 230, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
            >
              <Users size={24} weight="duotone" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Users
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {loadingStats ? <Spinner size={20} className="animate-spin" /> : stats?.total_users.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Total Printed Jobs */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(127, 163, 130, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-sage)',
              }}
            >
              <Printer size={24} weight="duotone" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Completed Prints
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {loadingStats ? <Spinner size={20} className="animate-spin" /> : stats?.total_printed_jobs.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Active Queue */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(229, 169, 60, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <Clock size={24} weight="duotone" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                In Print Queue
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {loadingStats ? <Spinner size={20} className="animate-spin" /> : stats?.total_queued_jobs.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Total Pages (Color & B&W) */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7',
              }}
            >
              <FileText size={24} weight="duotone" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Pages Printed
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {loadingStats ? <Spinner size={20} className="animate-spin" /> : totalPagesPrinted.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Storage Used */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <HardDrives size={24} weight="duotone" />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Queued Storage
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {loadingStats ? <Spinner size={20} className="animate-spin" /> : `${stats?.total_storage_mb || 0} MB`}
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Line Trend Chart (Daily, Weekly, Monthly) */}
        <div style={{ marginBottom: '32px' }}>
          <MultiLineTrendChart
            data={trendsData}
            period={period}
            onPeriodChange={(newPeriod) => setPeriod(newPeriod)}
            loading={loadingTrends}
          />
        </div>

        {/* User Directory & Quota Consumption Table */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Registered Students Directory ({users.length})
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Individual quota consumption, total uploads, and activity breakdown
              </p>
            </div>

            {/* Search input */}
            <div
              style={{
                position: 'relative',
                minWidth: '260px',
              }}
            >
              <MagnifyingGlass
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search student email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {loadingUsers ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Spinner size={32} className="animate-spin" color="var(--accent-sage)" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
              No registered students matching "{searchQuery}".
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Student Email</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Joined</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Total Jobs</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>B&W Pages Used</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Color Pages Used</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const bwPercent = Math.min(100, Math.round((u.bw_pages_used / 400) * 100));
                    const colorPercent = Math.min(100, Math.round((u.color_pages_used / 20) * 100));
                    const createdStr = new Date(u.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {createdStr}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                          {u.total_jobs} uploads ({u.printed_jobs} printed)
                        </td>
                        {/* B&W Quota Column */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--accent-sage)', fontWeight: 600, minWidth: '55px' }}>
                              {u.bw_pages_used} / 400
                            </span>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                background: 'var(--bg-elevated)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${bwPercent}%`,
                                  height: '100%',
                                  background: 'var(--accent-sage)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        {/* Color Quota Column */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--accent-amber)', fontWeight: 600, minWidth: '45px' }}>
                              {u.color_pages_used} / 20
                            </span>
                            <div
                              style={{
                                width: '60px',
                                height: '6px',
                                background: 'var(--bg-elevated)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${colorPercent}%`,
                                  height: '100%',
                                  background: colorPercent > 80 ? '#ef4444' : 'var(--accent-amber)',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        {/* Role Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          {u.is_superadmin ? (
                            <span
                              style={{
                                background: 'rgba(127, 163, 130, 0.2)',
                                color: 'var(--accent-sage)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Superadmin
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-muted)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              Student
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
