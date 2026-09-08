import React from 'react';
import { Users, CalendarCheck, History, ClockAlert, LogOut, AlertTriangle } from 'lucide-react';

export default function StatsOverview({ stats = {} }) {
  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <CalendarCheck size={20} />
        </div>
        <div>
          <div className="stat-label">Điểm danh hôm nay</div>
          <div className="stat-value">{stats.today_count ?? 0}</div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
          <ClockAlert size={20} />
        </div>
        <div>
          <div className="stat-label">Đi trễ hôm nay</div>
          <div className="stat-value" style={{ color: stats.late_count > 0 ? '#f59e0b' : undefined }}>
            {stats.late_count ?? 0}
          </div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
          <LogOut size={20} />
        </div>
        <div>
          <div className="stat-label">Về sớm hôm nay</div>
          <div className="stat-value" style={{ color: stats.early_count > 0 ? '#ef4444' : undefined }}>
            {stats.early_count ?? 0}
          </div>
        </div>
      </div>

      {stats.unexcused_count > 0 && (
        <div className="glass-card stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.04)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="stat-label" style={{ color: '#ef4444', fontWeight: 700 }}>Chưa xin phép</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.unexcused_count}</div>
          </div>
        </div>
      )}

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper blue">
          <Users size={20} />
        </div>
        <div>
          <div className="stat-label">Nhân sự hệ thống</div>
          <div className="stat-value">{stats.total_employees ?? 0}</div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <History size={20} />
        </div>
        <div>
          <div className="stat-label">Tổng lượt điểm danh</div>
          <div className="stat-value">{stats.total_count ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
