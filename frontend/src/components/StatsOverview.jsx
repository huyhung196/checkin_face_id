import React from 'react';
import { Users, CalendarCheck, Globe, Wifi } from 'lucide-react';

export default function StatsOverview({ stats, publicIp, localIp }) {
  return (
    <div className="stats-grid">
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <CalendarCheck size={24} />
        </div>
        <div>
          <div className="stat-label">Điểm danh hôm nay</div>
          <div className="stat-value">{stats.today_count ?? 0}</div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper blue">
          <Users size={24} />
        </div>
        <div>
          <div className="stat-label">Nhân sự trong hệ thống</div>
          <div className="stat-value">{stats.total_employees ?? 0}</div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <Globe size={24} />
        </div>
        <div>
          <div className="stat-label">IP Mạng Public (WAN)</div>
          <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--brand-orange)' }}>
            {publicIp || 'Đang lấy...'}
          </div>
        </div>
      </div>

      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper blue">
          <Wifi size={24} />
        </div>
        <div>
          <div className="stat-label">IP Máy Client (LAN)</div>
          <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--brand-blue)' }}>
            {localIp || '127.0.0.1'}
          </div>
        </div>
      </div>
    </div>
  );
}
