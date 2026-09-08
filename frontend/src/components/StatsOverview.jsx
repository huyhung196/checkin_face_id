import React from 'react';
import { Users, History, ClockAlert, LogOut, LogIn, AlertTriangle, TimerOff } from 'lucide-react';

export default function StatsOverview({ stats = {} }) {
  return (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
      {/* 1. Lượt Vào Ca (Check-in) */}
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper green">
          <LogIn size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">Vào ca (Check-in)</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {stats.today_checkin_count ?? 0}
          </div>
          <div className="stat-sub">
            Tổng: <b>{stats.total_checkin_count ?? 0}</b> lượt
          </div>
        </div>
      </div>

      {/* 2. Lượt Tan Ca (Check-out) */}
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper rose">
          <LogOut size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">Tan ca (Check-out)</div>
          <div className="stat-value" style={{ color: '#f43f5e' }}>
            {stats.today_checkout_count ?? 0}
          </div>
          <div className="stat-sub">
            Tổng: <b>{stats.total_checkout_count ?? 0}</b> lượt
          </div>
        </div>
      </div>

      {/* 3. Đi trễ hôm nay */}
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper amber">
          <ClockAlert size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">Đi trễ hôm nay</div>
          <div className="stat-value" style={{ color: stats.late_count > 0 ? '#f59e0b' : undefined }}>
            {stats.late_count ?? 0}
          </div>
          <div className="stat-sub">Theo giờ chuẩn ca</div>
        </div>
      </div>

      {/* 4. Về sớm hôm nay */}
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper rose">
          <TimerOff size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">Về sớm hôm nay</div>
          <div className="stat-value" style={{ color: stats.early_count > 0 ? '#ef4444' : undefined }}>
            {stats.early_count ?? 0}
          </div>
          <div className="stat-sub">Trước giờ tan ca</div>
        </div>
      </div>

      {/* 5. Cần xử lý / Chưa phép (Chỉ hiện khi có vi phạm chưa duyệt) */}
      {stats.unexcused_count > 0 && (
        <div className="glass-card stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label" style={{ color: '#ef4444', fontWeight: 800 }}>Chưa xin phép</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.unexcused_count}</div>
            <div className="stat-sub" style={{ color: '#ef4444' }}>Cần HR duyệt</div>
          </div>
        </div>
      )}

      {/* 6. Nhân sự hệ thống */}
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper blue">
          <Users size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">Nhân sự hệ thống</div>
          <div className="stat-value">{stats.total_employees ?? 0}</div>
          <div className="stat-sub">Hồ sơ khuôn mặt</div>
        </div>
      </div>

      {/* 7. Tổng lượt điểm danh */}
      <div className="glass-card stat-card">
        <div className="stat-icon-wrapper orange">
          <History size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="stat-label">Tổng lượt điểm danh</div>
          <div className="stat-value">{stats.total_count ?? 0}</div>
          <div className="stat-sub">
            Hôm nay: <b>{stats.today_count ?? 0}</b> lượt
          </div>
        </div>
      </div>
    </div>
  );
}
