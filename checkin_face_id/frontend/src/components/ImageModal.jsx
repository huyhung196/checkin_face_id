import React from 'react';
import { X, Globe, Clock, User, Smartphone, ShieldCheck, Wifi } from 'lucide-react';

export default function ImageModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} color="#FD6900" />
            Chi Tiết Ảnh Điểm Danh Face ID #{item.id}
          </h3>
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onClose}
            style={{ width: 36, height: 36 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Full Image */}
        <div className="modal-img-wrapper">
          <img src={item.photo_path} alt="Check-in snapshot" className="modal-img" />
        </div>

        {/* Metadata Grid */}
        <div className="modal-meta-grid">
          <div className="modal-meta-item">
            <div className="modal-meta-label">Nhân Viên / Người Điểm Danh</div>
            <div className="modal-meta-value">
              {item.user_name} {item.employee_code ? `(${item.employee_code})` : ''}
            </div>
          </div>

          <div className="modal-meta-item">
            <div className="modal-meta-label">Độ Khớp AI Model</div>
            <div className="modal-meta-value" style={{ color: item.match_confidence > 0 ? '#10b981' : '#f59e0b' }}>
              {item.match_confidence > 0 ? `${item.match_confidence}% (Chính xác)` : 'Chưa khớp hồ sơ'}
            </div>
          </div>

          <div className="modal-meta-item">
            <div className="modal-meta-label">Trạng Thái GPS</div>
            <div className="modal-meta-value" style={{ color: item.gps_matched === 1 ? '#10b981' : item.gps_matched === 0 ? '#e11d48' : 'var(--text-muted)' }}>
              {item.gps_status || '---'}
            </div>
          </div>

          <div className="modal-meta-item">
            <div className="modal-meta-label">Thời Gian Ghi Nhận</div>
            <div className="modal-meta-value">{item.formatted_time}</div>
          </div>

          <div className="modal-meta-item">
            <div className="modal-meta-label">Thiết Bị & Trình Duyệt</div>
            <div className="modal-meta-value">{item.device_info || 'Không rõ'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
