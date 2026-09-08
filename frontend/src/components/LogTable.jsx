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
  Calendar,
  ClockAlert,
  LogOut,
  AlertTriangle,
  SlidersHorizontal,
  CheckCircle2,
  FileText
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
  onExport,
  isAutoReload = true,
  setIsAutoReload,
  attendanceFilter = 'all',
  setAttendanceFilter,
  stats = {},
  onOpenShiftSetup,
  onOpenPermissionModal
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

        <div className="log-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {onOpenShiftSetup && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenShiftSetup}
              title="Cài đặt ca làm việc, mốc giờ vào/ra & ân hạn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Clock size={14} color="var(--brand-orange)" />
              <span className="hide-on-mobile">Ca Làm Việc</span>
            </button>
          )}

          {setIsAutoReload && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsAutoReload(!isAutoReload)}
              title={isAutoReload ? "Tự động tải lại mỗi 4s đang BẬT. Bấm để tạm dừng" : "Tự động tải lại đang TẮT. Bấm để bật"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '6px 11px',
                borderRadius: 8,
                borderColor: isAutoReload ? 'rgba(16, 185, 129, 0.4)' : undefined,
                background: isAutoReload ? 'rgba(16, 185, 129, 0.08)' : undefined,
                color: isAutoReload ? '#10b981' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isAutoReload ? '#10b981' : '#94a3b8',
                boxShadow: isAutoReload ? '0 0 6px #10b981' : 'none',
                display: 'inline-block'
              }} />
              <span>{isAutoReload ? 'Live (4s)' : 'Tạm dừng'}</span>
            </button>
          )}

          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => onRefresh(false)}
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
            title="Xuất file Excel CSV (theo ngày & trạng thái đang lọc)"
          >
            <Download size={15} />
            <span className="hide-on-mobile">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Toolbar lọc đa chiều: Tìm kiếm + Chọn Ngày + Combobox Tình Trạng */}
      <div className="table-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="search-box" style={{ flex: '1 1 180px', minWidth: 150 }}>
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            className="search-input"
            placeholder="Tìm tên hoặc mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
              Tất cả ngày
            </button>
          )}
        </div>

        {/* Combobox Tình trạng chấm công */}
        {setAttendanceFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select
              className="search-input"
              style={{
                padding: '7px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: 8,
                background: attendanceFilter !== 'all' ? 'rgba(253, 105, 0, 0.08)' : '#fff',
                borderColor: attendanceFilter !== 'all' ? 'var(--brand-orange)' : 'var(--border-card)',
                color: attendanceFilter !== 'all' ? 'var(--brand-orange)' : 'var(--text-main)',
                cursor: 'pointer',
                minWidth: 175
              }}
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="unexcused">Chưa xin phép {stats.unexcused_count > 0 ? `(${stats.unexcused_count})` : ''}</option>
              <option value="late">Đi trễ {stats.late_count > 0 ? `(${stats.late_count})` : ''}</option>
              <option value="early">Về sớm {stats.early_count > 0 ? `(${stats.early_count})` : ''}</option>
              <option value="excused">Đã có phép</option>
              <option value="checkin">Vào ca ({stats.today_checkin_count || 0})</option>
              <option value="checkout">Tan ca ({stats.today_checkout_count || 0})</option>
            </select>

            {attendanceFilter !== 'all' && (
              <button
                type="button"
                className="btn-date-chip clear"
                onClick={() => setAttendanceFilter('all')}
                title="Bỏ lọc tình trạng"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Đặt lại
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="empty-state">
          <Inbox size={44} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>
            {selectedDate || attendanceFilter !== 'all'
              ? `Không tìm thấy lượt điểm danh nào phù hợp với bộ lọc đang chọn.` 
              : 'Chưa có lượt điểm danh nào.'}
          </p>
          {(selectedDate || attendanceFilter !== 'all' || search) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {selectedDate && (
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setSelectedDate && setSelectedDate('')}
                >
                  Xóa lọc ngày
                </button>
              )}
              {attendanceFilter !== 'all' && (
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => setAttendanceFilter && setAttendanceFilter('all')}
                >
                  Xóa lọc tình trạng
                </button>
              )}
            </div>
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
                  <th>Tình Trạng Ca</th>
                  <th>Xin Phép (HR)</th>
                  <th>Độ Khớp AI</th>
                  <th>Khớp GPS</th>
                  <th>Thời Gian</th>
                  <th>Thiết Bị</th>
                  <th style={{ textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => {
                  const attStatus = row.attendance_status || 'Đúng Giờ';
                  const isLate = attStatus === 'Đi Trễ';
                  const isEarly = attStatus === 'Về Sớm';
                  const hasPerm = Boolean(row.has_permission);

                  return (
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
                            <span className="confidence-tag" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 600 }}>
                              Tan Ca
                            </span>
                            {row.working_duration && row.working_duration !== '---' && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                                {row.working_duration}
                              </div>
                            )}
                          </div>
                        ) : row.check_type === 'Vào Ca' ? (
                          <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 600 }}>
                            Vào Ca
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>---</span>
                        )}
                      </td>

                      {/* Cột Tình Trạng Ca (Đúng Giờ / Đi Trễ / Về Sớm) */}
                      <td>
                        {isLate ? (
                          <span 
                            className="confidence-tag"
                            style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 600 }}
                            title={`Đi trễ ${row.late_minutes} phút so với giờ quy định`}
                          >
                            Trễ {row.late_minutes}p
                          </span>
                        ) : isEarly ? (
                          <span 
                            className="confidence-tag"
                            style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 600 }}
                            title={`Về sớm ${row.early_minutes} phút so với giờ tan ca`}
                          >
                            Sớm {row.early_minutes}p
                          </span>
                        ) : (
                          <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669', fontWeight: 600 }}>
                            Đúng Giờ
                          </span>
                        )}
                      </td>

                      {/* Cột Xin Phép (HR) */}
                      <td>
                        {isLate || isEarly ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <button
                              type="button"
                              onClick={() => onOpenPermissionModal && onOpenPermissionModal(row)}
                              title={hasPerm ? `Đã duyệt phép: ${row.permission_note || 'Có phép'} (Bấm để sửa)` : 'Bấm để duyệt có phép'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: hasPerm ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                background: hasPerm ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                                color: hasPerm ? '#059669' : '#ef4444',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: 'fit-content'
                              }}
                            >
                              {hasPerm ? 'Đã có phép' : 'Chưa duyệt'}
                            </button>
                            {hasPerm && row.permission_note && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.permission_note}>
                                {row.permission_note}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>---</span>
                        )}
                      </td>

                      <td>
                        {row.match_confidence >= 50.0 ? (
                          <span className="confidence-tag" style={{ fontFamily: 'var(--font-mono)' }}>
                            {row.match_confidence}%
                          </span>
                        ) : (
                          <span className="confidence-tag unmatched">
                            Người Lạ
                          </span>
                        )}
                      </td>
                      <td>
                        {row.gps_matched === 1 ? (
                          <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                            Đạt ({row.gps_distance}m)
                          </span>
                        ) : row.gps_matched === 0 ? (
                          <span className="confidence-tag unmatched" style={{ background: 'rgba(225, 29, 72, 0.1)', color: '#e11d48' }} title={`Khoảng cách ${row.gps_distance}m (Bán kính ${row.gps_radius}m)`}>
                            Ngoài vùng ({row.gps_distance}m)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>---</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {row.formatted_time}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 120, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.device_info}>
                          {row.device_info || '---'}
                        </span>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="mobile-only log-cards-container">
            {logs.map((row) => {
              const attStatus = row.attendance_status || 'Đúng Giờ';
              const isLate = attStatus === 'Đi Trễ';
              const isEarly = attStatus === 'Về Sớm';
              const hasPerm = Boolean(row.has_permission);

              return (
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

                      <div className="log-mobile-meta-row" style={{ flexWrap: 'wrap', gap: 4 }}>
                        {row.check_type === 'Tan Ca' ? (
                          <span className="confidence-tag" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 600 }}>
                            Tan Ca {row.working_duration && row.working_duration !== '---' ? `(${row.working_duration})` : ''}
                          </span>
                        ) : row.check_type === 'Vào Ca' ? (
                          <span className="confidence-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 600 }}>
                            Vào Ca
                          </span>
                        ) : null}

                        {isLate ? (
                          <span className="confidence-tag" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 600 }}>
                            Trễ {row.late_minutes}p
                          </span>
                        ) : isEarly ? (
                          <span className="confidence-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: 600 }}>
                            Sớm {row.early_minutes}p
                          </span>
                        ) : null}

                        {(isLate || isEarly) && (
                          <button
                            type="button"
                            onClick={() => onOpenPermissionModal && onOpenPermissionModal(row)}
                            style={{
                              border: hasPerm ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                              background: hasPerm ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                              color: hasPerm ? '#059669' : '#ef4444',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {hasPerm ? 'Có phép' : 'Chưa phép'}
                          </button>
                        )}

                        <span className="log-mobile-time">
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
                        {row.device_info}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
