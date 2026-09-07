import React from 'react';
import { AlertTriangle, UserCheck, RefreshCw, X, ShieldAlert, ArrowRight } from 'lucide-react';

export default function DuplicateFaceModal({ 
  duplicateInfo, 
  newCandidateData, 
  onCancel, 
  onAppendToExisting, 
  onForceCreate 
}) {
  if (!duplicateInfo || !duplicateInfo.existing_employee) return null;

  const existing = duplicateInfo.existing_employee;
  const similarity = duplicateInfo.similarity_percent || Math.round((1 - duplicateInfo.similarity_distance / 0.6) * 100);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="glass-card modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-rose)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={24} color="#f43f5e" />
            Cảnh Báo: Trùng Khuôn Mặt!
          </h3>
          <button type="button" className="btn-icon" onClick={onCancel} style={{ width: 34, height: 34 }}>
            <X size={16} />
          </button>
        </div>

        {/* Warning Body */}
        <div style={{
          padding: '14px 16px',
          background: 'rgba(244, 63, 94, 0.08)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 14,
          marginBottom: 16
        }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            Khuôn mặt vừa quét có độ tương đồng <strong>{similarity}%</strong> với một nhân viên đã đăng ký trong hệ thống:
          </p>
        </div>

        {/* Existing Employee Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          marginBottom: 20,
          boxShadow: 'var(--shadow-sm)'
        }}>
          {existing.avatar_path ? (
            <img 
              src={existing.avatar_path} 
              alt={existing.full_name} 
              style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--brand-orange)' }}
            />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={28} color="#64748b" />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {existing.full_name}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--brand-blue)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {existing.employee_code} • {existing.department}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Đã có {existing.sample_count || 1} mẫu góc mặt đã lưu
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f43f5e, #fd6900)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: '0.85rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)'
          }}>
            {similarity}% Giống
          </div>
        </div>

        {/* Action Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Option 1: Append angle samples to existing employee */}
          <button 
            type="button" 
            className="btn-primary" 
            style={{ width: '100%', padding: '12px 18px', fontSize: '0.9rem', justifyContent: 'space-between' }}
            onClick={() => onAppendToExisting(existing.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={18} />
              Cập nhật thêm góc chụp cho nhân viên này ({existing.full_name})
            </span>
            <ArrowRight size={16} />
          </button>

          {/* Option 2: Force create new employee */}
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ width: '100%', padding: '10px 18px', fontSize: '0.85rem', justifyContent: 'center', color: '#b91c1c' }}
            onClick={onForceCreate}
          >
            ⚠️ Vẫn tiếp tục tạo mới cho "{newCandidateData.full_name}" (Bỏ qua cảnh báo)
          </button>

          {/* Option 3: Cancel and retake */}
          <button 
            type="button" 
            className="btn-secondary" 
            style={{ width: '100%', padding: '10px 18px', fontSize: '0.85rem', justifyContent: 'center' }}
            onClick={onCancel}
          >
            ❌ Hủy Bỏ & Chụp Lại
          </button>
        </div>
      </div>
    </div>
  );
}
