import React from 'react';
import { Users, CalendarCheck, History } from 'lucide-react';

export default function StatsOverview({ stats = {} }) {
  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <CalendarCheck size={22} />
        </div>
        <div>
          <div className="stat-label">Điểm danh hôm nay</div>
          <div className="stat-value">{stats.today_count ?? 0}</div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper blue">
          <Users size={22} />
        </div>
        <div>
          <div className="stat-label">Nhân sự hệ thống</div>
          <div className="stat-value">{stats.total_employees ?? 0}</div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <History size={22} />
        </div>
        <div>
          <div className="stat-label">Tổng lượt điểm danh</div>
          <div className="stat-value">{stats.total_count ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
