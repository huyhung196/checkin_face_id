import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Save, AlertCircle, CheckCircle2, User, Clock, MessageSquare } from 'lucide-react';
import { logsApi } from '../api/logsApi';

const QUICK_REASONS = [
  "Có đơn xin phép được duyệt",
  "Đi công tác / Gặp đối tác",
  "Khám bệnh / Lý do sức khỏe",
  "Kẹt xe / Mưa ngập có báo trước",
  "Việc gia đình đột xuất có báo quản lý"
];

export default function PermissionModal({ logItem, onClose, onSaveSuccess }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionNote, setPermissionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (logItem) {
      setHasPermission(Boolean(logItem.has_permission));
      setPermissionNote(logItem.permission_note || '');
      setErrorMsg(null);
    }
  }, [logItem]);

  if (!logItem) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload = {
        has_permission: hasPermission,
        permission_note: permissionNote.trim(),
        updated_by: "HR/Admin"
      };
      const res = await logsApi.updatePermission(logItem.id, payload);
      if (res && res.success) {
        if (onSaveSuccess) onSaveSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || 'Lỗi khi cập nhật trạng thái xin phép');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi cập nhật');
    } finally {
      setIsSaving(false);
    }
  };

  const attStatus = logItem.attendance_status || 'Đúng Giờ';
  const isLate = attStatus === 'Đi Trễ';
  const isEarly = attStatus === 'Về Sớm';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="glass-card modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: '92%', padding: '24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Xác Nhận Xin Phép (HR)</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Đánh dấu hợp lệ cho trường hợp đi trễ / về sớm
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

        {/* Thông tin lượt điểm danh */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-card)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
              {logItem.user_name}
            </span>
            <span style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(0, 106, 255, 0.1)',
              color: 'var(--brand-blue)',
              fontWeight: 700
            }}>
              {logItem.employee_code || 'NV---'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} /> {logItem.formatted_time}
            </span>
            <span>•</span>
            <span style={{ fontWeight: 600 }}>{logItem.check_type || 'Vào Ca'}</span>
          </div>

          <div style={{ marginTop: 2 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
              background: isLate ? 'rgba(245, 158, 11, 0.12)' : isEarly ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: isLate ? '#f59e0b' : isEarly ? '#ef4444' : '#10b981'
            }}>
              {attStatus}
              {logItem.late_minutes > 0 && ` (${logItem.late_minutes} phút)`}
              {logItem.early_minutes > 0 && ` (${logItem.early_minutes} phút)`}
            </span>
          </div>
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
          {/* Toggle trạng thái phép */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 10,
            background: hasPermission ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
            border: hasPermission ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-card)',
            cursor: 'pointer'
          }} onClick={() => setHasPermission(!hasPermission)}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: hasPermission ? '#10b981' : 'var(--text-main)' }}>
                {hasPermission ? '✓ Đã có đơn xin phép' : 'Chưa có đơn xin phép (Không phép)'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {hasPermission ? 'Lượt này sẽ được tính là có phép khi xuất báo cáo' : 'Đang tính là không phép'}
              </div>
            </div>

            <input 
              type="checkbox"
              checked={hasPermission}
              onChange={(e) => setHasPermission(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#10b981' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Ô nhập lý do */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MessageSquare size={13} /> Lý do / Ghi chú xin phép
            </label>
            <input
              type="text"
              className="custom-input"
              value={permissionNote}
              onChange={(e) => setPermissionNote(e.target.value)}
              placeholder="VD: Đi gặp đối tác, kẹt xe có báo trước..."
            />
          </div>

          {/* Gợi ý lý do nhanh */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Gợi ý lý do nhanh:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPermissionNote(r);
                    setHasPermission(true);
                  }}
                  style={{
                    fontSize: '0.72rem',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border-card)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  + {r}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={isSaving}
            >
              Đóng
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Đánh Dấu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
