import React from 'react';
import { 
  History, 
  Search, 
  RefreshCw, 
  Download, 
  Trash2, 
  Globe, 
  Smartphone, 
  User, 
  Clock, 
  Inbox, 
  ShieldCheck,
  Wifi,
  Calendar
} from 'lucide-react';

export default function LogTable({ 
  logs = [], 
  isLoading, 
  onRefresh, 
  onDelete, 
  onImageClick, 
  search, 
  setSearch,
  selectedDate = '',
  setSelectedDate,
  onExport
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="glass-card log-card">
      {/* Heading */}
      <div className="card-heading log-heading">
        <h2 className="card-title">
          <History size={20} color="#FD6900" />
          <span>Nhật Ký Điểm Danh ({logs.length})</span>
        </h2>

        <div className="log-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới bảng log"
          >
            <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
            <span className="hide-on-mobile">Làm mới</span>
          </button>

          <button 
            type="button" 
            className="btn-secondary"
            onClick={onExport}
            title="Xuất file Excel CSV"
          >
            <Download size={15} />
            <span className="hide-on-mobile">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Toolbar tìm kiếm & lọc ngày */}
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Tìm tên hoặc mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="date-filter-group">
          <div className="date-filter-box">
            <Calendar size={14} className="date-icon" />
            <input 
              type="date" 
              className="date-input"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate && setSelectedDate(e.target.value)}
              title="Chọn ngày cần lọc"
            />
          </div>

          <button 
            type="button" 
            className={`btn-date-chip ${selectedDate === todayStr ? 'active' : ''}`}
            onClick={() => setSelectedDate && setSelectedDate(todayStr)}
            title="Xem điểm danh hôm nay"
          >
            Hôm nay
          </button>

          {selectedDate && (
            <button 
              type="button" 
              className="btn-date-chip clear"
              onClick={() => setSelectedDate && setSelectedDate('')}
              title="Xem tất cả các ngày"
            >
              Tất cả
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="empty-state">
          <Inbox size={44} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>
            {selectedDate 
              ? `Không có lượt điểm danh nào trong ngày ${selectedDate}` 
              : 'Chưa có lượt điểm danh nào'}
          </p>
          {selectedDate && (
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ marginTop: 8, fontSize: '0.8rem' }}
              onClick={() => setSelectedDate && setSelectedDate('')}
            >
              Xóa bộ lọc ngày
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-responsive desktop-only">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Ảnh Chụp</th>
                  <th>Mã NV</th>
                  <th>Họ & Tên</th>
                  <th>Loại Ca</th>
                  <th>Độ Khớp AI</th>
                  <th>Khớp GPS</th>
                  <th>Thời Gian</th>
                  <th>Thiết Bị</th>
                  <th style={{ textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.photo_path ? (
                        <img 
                          src={row.photo_path} 
                          alt="Snapshot" 
                          className="table-photo-thumb"
                          onClick={() => onImageClick(row)}
                          title="Bấm xem ảnh to"
                        />
                      ) : (
                        <div className="table-photo-thumb placeholder">
                          <User size={18} color="#64748b" />
                        </div>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)' }}>
                        {row.employee_code || '---'}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{row.user_name}</strong>
                    </td>
                    <td>
                      {row.check_type === 'Tan Ca' ? (
                        <div>
                          <span className="confidence-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 700 }}>
                            🔴 Tan Ca
                          </span>
                          {row.working_duration && row.working_duration !== '---' && (
                            <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: 3, fontWeight: 600 }}>
                              ⏱️ {row.working_duration}
                            </div>
                          )}
                        </div>
                      ) : row.check_type === 'Vào Ca' ? (
                        <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontWeight: 700 }}>
                          🟢 Vào Ca
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>---</span>
                      )}
                    </td>
                    <td>
                      {row.match_confidence >= 50.0 ? (
                        <span className="confidence-tag">
                          ✓ {row.match_confidence}%
                        </span>
                      ) : (
                        <span className="confidence-tag unmatched">
                          Người Lạ
                        </span>
                      )}
                    </td>
                    <td>
                      {row.gps_matched === 1 ? (
                        <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                          ✓ Đạt ({row.gps_distance}m)
                        </span>
                      ) : row.gps_matched === 0 ? (
                        <span className="confidence-tag unmatched" style={{ background: 'rgba(225, 29, 72, 0.15)', color: '#e11d48' }} title={`Khoảng cách ${row.gps_distance}m (Bán kính ${row.gps_radius}m)`}>
                          ❌ Vi Phạm ({row.gps_distance}m)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>---</span>
                      )}
                    </td>
                    <td>
                      <div className="log-time-cell">
                        <Clock size={13} color="#FD6900" />
                        <span>{row.formatted_time}</span>
                      </div>
                    </td>
                    <td>
                      <div className="log-device-cell">
                        <Smartphone size={13} />
                        <span>{row.device_info || 'Không rõ'}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        className="btn-del"
                        onClick={() => onDelete(row.id)}
                        title={`Xóa log #${row.id}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-only log-cards-container">
            {logs.map((row) => (
              <div key={row.id} className="log-mobile-card">
                <div className="log-mobile-card-top">
                  {row.photo_path ? (
                    <img 
                      src={row.photo_path} 
                      alt="Snapshot" 
                      className="log-mobile-thumb"
                      onClick={() => onImageClick(row)}
                      title="Bấm xem ảnh to"
                    />
                  ) : (
                    <div className="log-mobile-thumb placeholder">
                      <User size={20} color="#94a3b8" />
                    </div>
                  )}

                  <div className="log-mobile-info">
                    <div className="log-mobile-user-row">
                      <span className="log-mobile-user-name">{row.user_name}</span>
                      {row.employee_code && (
                        <span className="log-mobile-emp-code">({row.employee_code})</span>
                      )}
                    </div>

                    <div className="log-mobile-meta-row">
                      {row.check_type === 'Tan Ca' ? (
                        <span className="confidence-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700 }}>
                          🔴 Tan Ca {row.working_duration && row.working_duration !== '---' ? `(${row.working_duration})` : ''}
                        </span>
                      ) : row.check_type === 'Vào Ca' ? (
                        <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                          🟢 Vào Ca
                        </span>
                      ) : null}
                      {row.match_confidence >= 50.0 ? (
                        <span className="confidence-tag">✓ {row.match_confidence}% Khớp</span>
                      ) : (
                        <span className="confidence-tag unmatched">Người Lạ</span>
                      )}
                      {row.gps_matched === 1 ? (
                        <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>✓ GPS Đạt</span>
                      ) : row.gps_matched === 0 ? (
                        <span className="confidence-tag unmatched" style={{ background: 'rgba(225, 29, 72, 0.15)', color: '#e11d48' }}>❌ GPS Vi Phạm</span>
                      ) : null}
                      <span className="log-mobile-time">
                        <Clock size={11} color="#FD6900" />
                        {row.formatted_time}
                      </span>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn-del"
                    onClick={() => onDelete(row.id)}
                    title={`Xóa log #${row.id}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {row.device_info && (
                  <div className="log-mobile-card-bottom">
                    <span className="log-mobile-device">
                      <Smartphone size={11} />
                      {row.device_info}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
