import React from 'react';
import { CheckCircle2, Globe, Clock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function CheckinResult({ result, onImageClick }) {
  if (!result) return null;

  const isMatched = (result.match_confidence >= 50.0) && Boolean(result.employee_code);
  const isCheckOut = result.check_type === 'Tan Ca';
  const isCheckIn = result.check_type === 'Vào Ca';

  return (
    <div className="result-banner" style={{
      borderColor: isCheckOut ? 'rgba(239, 68, 68, 0.4)' : isMatched ? 'rgba(16, 185, 129, 0.4)' : 'rgba(0, 106, 255, 0.3)',
      borderLeft: `5px solid ${isCheckOut ? '#ef4444' : isMatched ? '#10b981' : '#006AFF'}`
    }}>
      {result.photo_path && (
        <img 
          src={result.photo_path} 
          alt="Snapshot" 
          className="result-thumb" 
          onClick={() => onImageClick(result)}
          style={{ cursor: 'pointer' }}
          title="Bấm để xem ảnh phóng to"
        />
      )}

      <div className="result-info">
        <div className="result-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {isMatched ? (
            <>
              <ShieldCheck size={20} color={isCheckOut ? "#ef4444" : "#10b981"} />
              <span style={{ fontWeight: 700 }}>
                {isCheckOut ? '🔴 Tan Ca Thành Công!' : '🟢 Vào Ca Thành Công!'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: isCheckOut ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: isCheckOut ? '#ef4444' : '#10b981'
              }}>
                {isCheckOut ? 'Check-out' : 'Check-in'}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} color="#006AFF" />
              <span>Đã Ghi Nhận Lượt Điểm Danh</span>
            </>
          )}
        </div>
        
        <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginTop: 4 }}>
          <strong>{result.user_name}</strong> 
          {result.employee_code && <span style={{ color: 'var(--brand-blue)', marginLeft: 6, fontWeight: 700 }}>({result.employee_code})</span>}
          {result.match_confidence >= 50.0 && (
            <span className="confidence-tag" style={{ marginLeft: 8 }}>
              {result.match_confidence}% Khớp
            </span>
          )}
          {result.gps_matched === 1 ? (
            <span className="confidence-tag" style={{ marginLeft: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              ✓ GPS Đạt ({result.gps_distance}m)
            </span>
          ) : result.gps_matched === 0 ? (
            <span className="confidence-tag unmatched" style={{ marginLeft: 8, background: 'rgba(225, 29, 72, 0.15)', color: '#e11d48' }}>
              ❌ GPS Vi Phạm ({result.gps_distance}m)
            </span>
          ) : null}
        </div>

        {/* Thông tin thời gian & thời lượng làm việc nếu là Tan Ca */}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} />
            {result.formatted_time}
          </span>

          {isCheckOut && result.working_duration && result.working_duration !== '---' && (
            <span style={{ 
              fontSize: '0.82rem', 
              color: '#d97706', 
              fontWeight: 600,
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              ⏱️ Thời gian làm việc: {result.working_duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
