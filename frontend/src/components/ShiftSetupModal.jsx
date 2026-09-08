import React, { useState, useEffect } from 'react';
import { Clock, X, Save, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { shiftApi } from '../api/shiftApi';

export default function ShiftSetupModal({ isOpen, onClose, onSaveSuccess }) {
  const [shiftName, setShiftName] = useState('Ca Hành Chính Mebieco');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:30');
  const [gracePeriod, setGracePeriod] = useState(15);
  const [earlyBuffer, setEarlyBuffer] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    async function loadSettings() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await shiftApi.getSettings();
        if (res && res.success && res.data) {
          setShiftName(res.data.shift_name || 'Ca Hành Chính Mebieco');
          setStartTime(res.data.start_time || '08:00');
          setEndTime(res.data.end_time || '17:30');
          setGracePeriod(Number(res.data.grace_period_minutes ?? 15));
          setEarlyBuffer(Number(res.data.early_leave_buffer_minutes ?? 0));
        }
      } catch (err) {
        console.error("Lỗi khi tải cấu hình ca:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  // Tính giờ mốc ân hạn
  const calcGraceTimeStr = () => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const totalMins = h * 60 + m + Number(gracePeriod);
      const gh = Math.floor(totalMins / 60) % 24;
      const gm = totalMins % 60;
      return `${String(gh).padStart(2, '0')}:${String(gm).padStart(2, '0')}`;
    } catch {
      return startTime;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        shift_name: shiftName,
        start_time: startTime,
        end_time: endTime,
        grace_period_minutes: Number(gracePeriod),
        early_leave_buffer_minutes: Number(earlyBuffer)
      };
      const res = await shiftApi.saveSettings(payload);
      if (res && res.success) {
        if (onSaveSuccess) onSaveSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || 'Lỗi khi lưu cấu hình ca làm việc');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi lưu ca làm việc');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: '92%', padding: '24px', margin: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(253, 105, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-orange)'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Cấu Hình Ca Làm Việc</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Thiết lập mốc giờ Vào Ca, Tan Ca & thời gian ân hạn
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onClose}
            style={{ width: 32, height: 32 }}
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '0.84rem',
            marginBottom: 16
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Tên Ca Làm Việc</label>
            <input
              type="text"
              className="custom-input"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="VD: Ca Hành Chính Mebieco"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Giờ Vào Ca Chuẩn *</label>
              <input
                type="time"
                className="custom-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                style={{ fontWeight: 700 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giờ Tan Ca Chuẩn *</label>
              <input
                type="time"
                className="custom-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                style={{ fontWeight: 700 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" title="Cho phép chấm công trễ tối đa X phút mà không bị tính là Đi Trễ">
                Cho Phép Trễ (Ân hạn)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="custom-input"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(e.target.value)}
                  style={{ paddingRight: 45 }}
                />
                <span style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}>
                  phút
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" title="Cho phép về sớm tối đa X phút mà không tính là Về Sớm">
                Cho Phép Về Sớm
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="custom-input"
                  value={earlyBuffer}
                  onChange={(e) => setEarlyBuffer(e.target.value)}
                  style={{ paddingRight: 45 }}
                />
                <span style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}>
                  phút
                </span>
              </div>
            </div>
          </div>

          {/* Quy tắc tóm tắt & Preview */}
          <div style={{
            background: 'rgba(253, 105, 0, 0.06)',
            border: '1px solid rgba(253, 105, 0, 0.2)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: 'var(--text-main)'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--brand-orange)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck size={14} /> Quy tắc tự động đối soát:
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
              <li>
                <b>Vào Ca:</b> Check-in sau <b>{calcGraceTimeStr()}</b> sẽ được ghi nhận là <span style={{ color: '#f59e0b', fontWeight: 700 }}>Đi Trễ</span> (tính từ {startTime}).
              </li>
              <li>
                <b>Tan Ca:</b> Check-out trước <b>{endTime}</b> sẽ được ghi nhận là <span style={{ color: '#ef4444', fontWeight: 700 }}>Về Sớm</span>.
              </li>
            </ul>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={isSaving}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Ca'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
