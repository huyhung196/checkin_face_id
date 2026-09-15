import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, FileSpreadsheet, Calendar, User, Download, 
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Eye
} from 'lucide-react';
import { systemApi } from '../api/systemApi';

export default function MonthlyReportModal({ 
  isOpen, 
  onClose, 
  employees = [],
  onExportCsv
}) {
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const firstDayOfMonthStr = `${currentYearMonth}-01`;

  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [rangeType, setRangeType] = useState('month_to_date'); // 'month_to_date' | 'full_month' | 'custom'
  const [fromDate, setFromDate] = useState(firstDayOfMonthStr);
  const [toDate, setToDate] = useState(todayStr);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreviewTable, setShowPreviewTable] = useState(false);

  // Khi đổi tháng, tự động tính toán lại khoảng ngày
  useEffect(() => {
    if (!yearMonth) return;
    const [yr, mo] = yearMonth.split('-').map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const isCurrentMo = yr === now.getFullYear() && mo === (now.getMonth() + 1);

    const fDate = `${yearMonth}-01`;
    let tDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

    if (rangeType === 'month_to_date') {
      if (isCurrentMo) {
        tDate = todayStr;
      }
      setFromDate(fDate);
      setToDate(tDate);
    } else if (rangeType === 'full_month') {
      setFromDate(fDate);
      setToDate(tDate);
    }
  }, [yearMonth, rangeType, todayStr]);

  // Tải dữ liệu preview khi mở modal hoặc thay đổi filter
  const fetchPreview = useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingPreview(true);
    try {
      const res = await systemApi.getMonthlyData({
        month: yearMonth,
        fromDate,
        toDate,
        employeeId: selectedEmployeeId
      });
      if (res && res.success) {
        setPreviewData(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu xem trước báo cáo:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, yearMonth, fromDate, toDate, selectedEmployeeId]);

  useEffect(() => {
    if (isOpen) {
      fetchPreview();
    }
  }, [isOpen, fetchPreview]);

  if (!isOpen) return null;

  // Xử lý tải file Excel .xlsx
  const handleDownloadExcel = () => {
    const url = systemApi.getMonthlyReportUrl({
      month: yearMonth,
      fromDate,
      toDate,
      employeeId: selectedEmployeeId
    });
    window.open(url, '_blank');
  };

  const totalEmployees = previewData?.summaries?.length || 0;
  const totalLogsCount = previewData?.report_data?.reduce((acc, emp) => acc + (emp.rows?.length || 0), 0) || 0;
  const totalLateCount = previewData?.summaries?.reduce((acc, s) => acc + (s.late_count || 0), 0) || 0;
  const totalEarlyCount = previewData?.summaries?.reduce((acc, s) => acc + (s.early_count || 0), 0) || 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: 780, 
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}>
              <FileSpreadsheet size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Báo Cáo Chấm Công Tháng (Excel HR)
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                Tự động gộp Check In - Check Out của 1 nhân viên thành 1 hàng theo chuẩn MEBIECO
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Chọn Tháng */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                📅 Chọn Tháng Báo Cáo
              </label>
              <input 
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              />
            </div>

            {/* Chọn Nhân Viên */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                👤 Nhân Viên
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">Tất cả nhân viên ({employees.length})</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chọn Phạm Vi Ngày */}
          <div style={{ 
            background: 'var(--bg-sub, rgba(0,0,0,0.02))', 
            padding: '14px 16px', 
            borderRadius: 10, 
            border: '1px solid var(--border-card)',
            marginBottom: 20
          }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
              ⏱️ Phạm Vi Lấy Dữ Liệu
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="rangeType" 
                  value="month_to_date"
                  checked={rangeType === 'month_to_date'}
                  onChange={() => setRangeType('month_to_date')}
                />
                <span>
                  <strong>Từ đầu tháng đến hôm nay</strong> (Mặc định: {fromDate.split('-').reverse().join('/')} ➔ {toDate.split('-').reverse().join('/')})
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="rangeType" 
                  value="full_month"
                  checked={rangeType === 'full_month'}
                  onChange={() => setRangeType('full_month')}
                />
                <span>
                  <strong>Cả tháng</strong> (Từ 01 đến ngày cuối tháng)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="rangeType" 
                  value="custom"
                  checked={rangeType === 'custom'}
                  onChange={() => setRangeType('custom')}
                />
                <span>
                  <strong>Khoảng ngày tùy chọn:</strong>
                </span>
              </label>

              {rangeType === 'custom' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4, paddingLeft: 22 }}>
                  <input 
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-card)',
                      fontSize: '0.8rem',
                      background: 'var(--bg-input)',
                      color: 'var(--text-main)'
                    }}
                  />
                  <span>đến</span>
                  <input 
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-card)',
                      fontSize: '0.8rem',
                      background: 'var(--bg-input)',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Hộp Thông Tin Mẫu Báo Cáo */}
          <div style={{
            background: 'rgba(17, 85, 204, 0.05)',
            border: '1px solid rgba(17, 85, 204, 0.2)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CheckCircle2 size={16} color="#1155CC" />
              <strong style={{ fontSize: '0.82rem', color: '#1155CC' }}>Đặc Điểm Báo Cáo Theo Mẫu Chuẩn:</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li><strong>Tự động gộp Check In - Check Out</strong> của 1 nhân viên trong ngày thành 1 hàng duy nhất.</li>
              <li><strong>Merge ô tên Nhân Viên</strong> theo chiều dọc, định dạng theo phong cách <code>report_example.xlsx</code>.</li>
              <li><strong>Tự động kiểm tra (Cột Check):</strong> Đúng Giờ, Đi Trễ - Có Phép, Về Sớm, Không Check Out...</li>
              <li><strong>Sheet 2 đính kèm:</strong> Bảng Tổng Hợp Công Tháng tính số ngày làm, tổng công, số lần trễ/sớm để HR chốt lương.</li>
            </ul>
          </div>

          {/* Thống kê nhanh xem trước */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 16
          }}>
            <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-card)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Số Nhân Viên</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-blue)' }}>{totalEmployees}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-card)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Số Ngày Có Log</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>{totalLogsCount}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-card)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lượt Đi Trễ</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706' }}>{totalLateCount}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 8, border: '1px solid var(--border-card)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lượt Về Sớm</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{totalEarlyCount}</div>
            </div>
          </div>

          {/* Toggle Xem Trước Dữ Liệu */}
          <div style={{ marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setShowPreviewTable(!showPreviewTable)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-blue)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: 0
              }}
            >
              <Eye size={15} />
              {showPreviewTable ? 'Ẩn bảng xem trước' : 'Xem trước bảng dữ liệu gộp'}
            </button>
          </div>

          {/* Bảng xem trước dữ liệu gộp */}
          {showPreviewTable && (
            <div style={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid var(--border-card)',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: '0.76rem'
            }}>
              {isLoadingPreview ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} className="spin-icon" style={{ marginBottom: 6 }} />
                  <div>Đang tải dữ liệu chấm công...</div>
                </div>
              ) : totalLogsCount === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chưa có dữ liệu chấm công nào trong khoảng ngày này.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#1155CC', color: '#fff' }}>
                    <tr>
                      <th style={{ padding: '6px 8px' }}>Nhân Viên</th>
                      <th style={{ padding: '6px 8px' }}>Ngày</th>
                      <th style={{ padding: '6px 8px' }}>Check In</th>
                      <th style={{ padding: '6px 8px' }}>Check Out</th>
                      <th style={{ padding: '6px 8px' }}>Thời Lượng</th>
                      <th style={{ padding: '6px 8px' }}>Check</th>
                      <th style={{ padding: '6px 8px' }}>Công</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData?.report_data?.map(empGroup => (
                      empGroup.rows.map((row, rIdx) => (
                        <tr 
                          key={`${empGroup.employee.id}-${row.date_str}`}
                          style={{
                            background: rIdx % 2 === 1 ? '#CFE2F3' : '#ffffff',
                            color: '#000000',
                            borderBottom: '1px solid #e2e8f0'
                          }}
                        >
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0B5394' }}>
                            {rIdx === 0 ? `${empGroup.employee.full_name} (${empGroup.employee.employee_code || ''})` : ''}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{row.day} ({row.weekday})</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{row.check_in || '---'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{row.check_out || '---'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>{row.working_duration}</td>
                          <td style={{ padding: '6px 8px', color: row.check_status?.includes('Có Phép') ? '#059669' : (row.check_status ? '#dc2626' : '#64748b'), fontWeight: row.check_status ? 600 : 400 }}>
                            {row.check_status || 'Đúng Giờ'}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>{row.work_credit}</td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--bg-sub, #f8fafc)',
          borderTop: '1px solid var(--border-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10
        }}>
          {onExportCsv ? (
            <button
              type="button"
              onClick={onExportCsv}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-card)',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Xuất danh sách log thô dạng CSV"
            >
              <Download size={14} />
              Xuất CSV Nhật Ký Thô
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-card)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <FileSpreadsheet size={16} />
              Tải Báo Cáo Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
