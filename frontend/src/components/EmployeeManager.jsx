import React, { useState, useRef } from 'react';
import { UserPlus, Users, Trash2, Camera, Upload, RefreshCw, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { detectFaceAndExtract } from '../utils/faceEngine';

export default function EmployeeManager({ 
  employees = [], 
  onRefresh, 
  onAddEmployee, 
  onDeleteEmployee, 
  initialDescriptor = null 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_code: '', full_name: '', department: 'Kỹ Thuật', position: 'Nhân viên', phone: '', email: ''
  });

  const [avatarBase64, setAvatarBase64] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState(initialDescriptor);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState(initialDescriptor ? 'Đã nhận vector khuôn mặt từ camera!' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const videoEnrollRef = useRef(null);
  const streamRef = useRef(null);

  const startEnrollCamera = async () => {
    setIsCapturingFace(true);
    setEnrollStatus('Đang mở camera...');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = s;
      if (videoEnrollRef.current) videoEnrollRef.current.srcObject = s;
      setEnrollStatus('Hãy nhìn thẳng vào camera và bấm "Quét & Lưu"');
    } catch (err) {
      setEnrollStatus('Không thể mở camera: ' + err.message);
      setIsCapturingFace(false);
    }
  };

  const stopEnrollCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setIsCapturingFace(false);
  };

  const captureAndExtract = async () => {
    if (!videoEnrollRef.current) return;
    setEnrollStatus('⏳ AI đang phân tích khuôn mặt...');
    const video = videoEnrollRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setAvatarBase64(canvas.toDataURL('image/jpeg', 0.95));

    const faceRes = await detectFaceAndExtract(canvas);
    if (faceRes?.descriptor?.length === 128) {
      setFaceDescriptor(faceRes.descriptor);
      setEnrollStatus('✅ Đã trích xuất 128 vector khuôn mặt!');
      stopEnrollCamera();
    } else {
      const retry = await detectFaceAndExtract(video);
      if (retry?.descriptor) {
        setFaceDescriptor(retry.descriptor);
        setEnrollStatus('✅ Đã trích xuất 128 vector khuôn mặt!');
        stopEnrollCamera();
      } else {
        setEnrollStatus('⚠️ Chưa phát hiện rõ khuôn mặt. Nhìn thẳng camera và giữ yên!');
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnrollStatus('⏳ Đang phân tích ảnh...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setAvatarBase64(base64);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = base64;
      img.onload = async () => {
        const faceRes = await detectFaceAndExtract(img);
        if (faceRes?.descriptor) {
          setFaceDescriptor(faceRes.descriptor);
          setEnrollStatus('✅ Đã nhận diện khuôn mặt từ file ảnh!');
        } else {
          setEnrollStatus('⚠️ Không tìm thấy khuôn mặt trong ảnh.');
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_code || !formData.full_name) { alert('Vui lòng điền Mã NV và Họ tên'); return; }
    setIsSubmitting(true);
    try {
      await onAddEmployee({ ...formData, image: avatarBase64, face_descriptor: faceDescriptor });
      setShowAddForm(false);
      setFormData({ employee_code: '', full_name: '', department: 'Kỹ Thuật', position: 'Nhân viên', phone: '', email: '' });
      setAvatarBase64(''); setFaceDescriptor(null); setEnrollStatus('');
    } catch (err) { alert(err.message || 'Lỗi khi thêm nhân viên'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="glass-card log-card">
      <div className="card-heading employee-heading">
        <h2 className="card-title">
          <Users size={20} color="#FD6900" />
          <span>Nhân Viên & Face ID</span>
        </h2>
        <div className="employee-actions">
          <button type="button" className="btn-icon" onClick={onRefresh} title="Làm mới">
            <RefreshCw size={16} />
          </button>
          <button type="button" className="btn-primary employee-add-btn"
            onClick={() => { setShowAddForm(!showAddForm); if (isCapturingFace) stopEnrollCamera(); }}>
            <UserPlus size={16} />
            <span className="hide-on-mobile">{showAddForm ? 'Đóng' : 'Thêm NV'}</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="employee-form-container">
          <h3 className="form-section-title">
            <UserPlus size={18} /> Đăng Ký Nhân Viên Mới
          </h3>

          <div className="employee-form-grid">
            <div className="form-group">
              <label className="form-label">Mã NV *</label>
              <input type="text" className="custom-input" placeholder="VD: NV001" required
                value={formData.employee_code} onChange={e => setFormData({ ...formData, employee_code: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Họ & Tên *</label>
              <input type="text" className="custom-input" placeholder="VD: Nguyễn Văn An" required
                value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phòng Ban</label>
              <select className="custom-input" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                <option value="Kỹ Thuật / IT">Kỹ Thuật / IT</option>
                <option value="Kinh Doanh / Sale">Kinh Doanh / Sale</option>
                <option value="Hành Chính Nhân Sự">Hành Chính Nhân Sự</option>
                <option value="Kế Toán">Kế Toán</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">SĐT</label>
              <input type="text" className="custom-input" placeholder="0987654321"
                value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          {/* Face ID Enrollment */}
          <div className="face-enroll-section">
            <h4 className="face-enroll-title">📸 Quét Khuôn Mặt Face ID</h4>

            {enrollStatus && (
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: faceDescriptor ? '#10b981' : '#f59e0b', marginBottom: 10 }}>
                {enrollStatus}
              </div>
            )}

            {isCapturingFace ? (
              <div className="enroll-camera-wrapper">
                <div className="enroll-camera-frame">
                  <video ref={videoEnrollRef} autoPlay playsInline muted className="enroll-camera-video" />
                </div>
                <div className="enroll-camera-actions">
                  <button type="button" className="btn-primary" onClick={captureAndExtract}>📸 Quét & Lưu</button>
                  <button type="button" className="btn-secondary" onClick={stopEnrollCamera}>Hủy</button>
                </div>
              </div>
            ) : (
              <div className="enroll-buttons">
                {avatarBase64 && (
                  <img src={avatarBase64} alt="Preview" className="enroll-preview-thumb" />
                )}
                <button type="button" className="btn-secondary" onClick={startEnrollCamera}>
                  <Camera size={15} /> Camera Live
                </button>
                <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} /> Tải Ảnh
                </button>
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                {faceDescriptor && (
                  <span className="face-vector-badge"><ShieldCheck size={14} /> 128D OK</span>
                )}
              </div>
            )}
          </div>

          <div className="form-submit-row">
            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu & Kích Hoạt Face ID'}
            </button>
          </div>
        </form>
      )}

      {/* Employee List - Card-based on mobile, Table on desktop */}
      {employees.length === 0 ? (
        <div className="empty-state">
          <Users size={40} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>Chưa có nhân viên</p>
          <p style={{ fontSize: '0.82rem', marginTop: 2 }}>Nhấn "Thêm NV" để đăng ký!</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-responsive desktop-only">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Ảnh</th><th>Mã NV</th><th>Họ & Tên</th><th>Phòng Ban</th><th>Face ID</th><th>Ngày Tạo</th><th style={{ textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      {emp.avatar_path ? <img src={emp.avatar_path} alt={emp.full_name} className="table-photo-thumb" /> :
                        <div className="table-photo-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0' }}><Users size={18} color="#64748b" /></div>}
                    </td>
                    <td><strong style={{ color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)' }}>{emp.employee_code}</strong></td>
                    <td><strong>{emp.full_name}</strong></td>
                    <td>{emp.department}</td>
                    <td>{emp.has_face ? <span className="confidence-tag">✓ Face ID</span> : <span className="confidence-tag unmatched">Chưa Quét</span>}</td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{emp.created_at || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button type="button" className="btn-del" onClick={() => onDeleteEmployee(emp.id)} title={`Xóa ${emp.full_name}`}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-only employee-card-list">
            {employees.map(emp => (
              <div key={emp.id} className="employee-card-item">
                <div className="employee-card-avatar">
                  {emp.avatar_path ? <img src={emp.avatar_path} alt={emp.full_name} /> :
                    <div className="avatar-placeholder"><Users size={22} color="#94a3b8" /></div>}
                </div>
                <div className="employee-card-info">
                  <div className="employee-card-name">{emp.full_name}</div>
                  <div className="employee-card-meta">
                    <span style={{ color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem' }}>{emp.employee_code}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{emp.department}</span>
                  </div>
                  {emp.has_face ? <span className="confidence-tag" style={{ marginTop: 2 }}>✓ Face ID</span> :
                    <span className="confidence-tag unmatched" style={{ marginTop: 2 }}>Chưa Quét</span>}
                </div>
                <button type="button" className="btn-del" onClick={() => onDeleteEmployee(emp.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
