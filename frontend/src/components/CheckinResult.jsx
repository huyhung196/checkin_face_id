import React from 'react';
import { CheckCircle2, Globe, Clock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function CheckinResult({ result, onImageClick }) {
  if (!result) return null;

  const isMatched = result.match_confidence > 0 || (result.employee_code && result.employee_code !== '');

  return (
    <div className="result-banner" style={{
      borderColor: isMatched ? 'rgba(253, 105, 0, 0.4)' : 'rgba(0, 106, 255, 0.3)'
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
        <div className="result-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isMatched ? (
            <>
              <ShieldCheck size={20} color="#FD6900" />
              <span>Xác Nhận Nhân Viên Thành Công!</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={20} color="#006AFF" />
              <span>Đã Ghi Nhật Ký Check-in!</span>
            </>
          )}
        </div>
        
        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: 4 }}>
          <strong>{result.user_name}</strong> 
          {result.employee_code && <span style={{ color: 'var(--brand-blue)', marginLeft: 6, fontWeight: 700 }}>({result.employee_code})</span>}
          {result.match_confidence > 0 && (
            <span className="confidence-tag" style={{ marginLeft: 8 }}>
              {result.match_confidence}% Khớp
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <span className="ip-tag">
            <Globe size={12} />
            Public IP: {result.public_ip}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            {result.formatted_time}
          </span>
        </div>
      </div>
    </div>
  );
}
