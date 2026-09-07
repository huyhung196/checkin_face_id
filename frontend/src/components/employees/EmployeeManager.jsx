import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users, Trash2, Camera, RefreshCw, Sparkles, CheckCircle2, ShieldCheck, Phone, Briefcase, Calendar, Lock } from 'lucide-react';
import MultiShotEnrollWizard from './MultiShotEnrollWizard';
import DuplicateFaceModal from './DuplicateFaceModal';
import { employeeApi } from '../../api/employeeApi';

export default function EmployeeManager({ 
  employees = [], 
  onRefresh, 
  initialDescriptor = null 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const [autoCode, setAutoCode] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    department: 'Kỹ Thuật / IT',
    position: 'Nhân viên',
    phone: '',
    email: ''
  });

  const [avatarImage, setAvatarImage] = useState('');
  const [faceDescriptors, setFaceDescriptors] = useState(initialDescriptor ? [initialDescriptor] : []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateModalInfo, setDuplicateModalInfo] = useState(null);

  // Tự động tải mã nhân viên kế tiếp từ Backend
  const fetchNextCode = useCallback(async () => {
    setIsLoadingCode(true);
    try {
      const res = await employeeApi.getNextCode();
      if (res && res.success && res.next_code) {
        setAutoCode(res.next_code);
        setFormData(prev => ({ ...prev, employee_code: res.next_code }));
      }
    } catch (err) {
      console.warn("Lỗi khi tải mã nhân viên tự động:", err);
      const maxNum = (employees || []).reduce((max, emp) => {
        const matches = (emp.employee_code || '').match(/\d+/g);
        if (matches) {
          const n = parseInt(matches[matches.length - 1], 10);
          return !isNaN(n) && n > max ? n : max;
        }
        return max;
      }, 0);
      const fallback = `NV${String(maxNum + 1).padStart(3, '0')}`;
      setAutoCode(fallback);
      setFormData(prev => ({ ...prev, employee_code: fallback }));
    } finally {
      setIsLoadingCode(false);
    }
  }, [employees]);

  useEffect(() => {
    if (showAddForm) {
      fetchNextCode();
    }
  }, [showAddForm, fetchNextCode]);

  const handleWizardComplete = ({ descriptors, avatarImage, sampleCount }) => {
    setFaceDescriptors(descriptors);
    setAvatarImage(avatarImage);
    setShowWizard(false);
  };

  const handleSubmit = async (e, forceCreate = false) => {
    if (e) e.preventDefault();

    if (!formData.full_name || !formData.full_name.trim()) {
      alert('Vui lòng điền Họ & Tên nhân viên!');
      return;
    }

    const finalCode = formData.employee_code || autoCode;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        employee_code: finalCode,
        image: avatarImage,
        face_descriptors: faceDescriptors,
        force_create: forceCreate
      };

      const res = await employeeApi.create(payload);

      if (res.is_duplicate) {
        setDuplicateModalInfo(res.duplicate_info);
        setIsSubmitting(false);
        return;
      }

      alert(`🎉 ${res.message || 'Đã thêm nhân viên thành công!'}`);
      setShowAddForm(false);
      setDuplicateModalInfo(null);
      setFormData({
        employee_code: '',
        full_name: '',
        department: 'Kỹ Thuật / IT',
        position: 'Nhân viên',
        phone: '',
        email: ''
      });
      setAutoCode('');
      setAvatarImage('');
      setFaceDescriptors([]);
      onRefresh();
    } catch (err) {
      alert(`❌ ${err.message || 'Lỗi khi tạo nhân viên'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppendToExisting = async (existingEmpId) => {
    try {
      const res = await employeeApi.appendDescriptors(existingEmpId, faceDescriptors, avatarImage);
      alert(`✅ ${res.message}`);
      setDuplicateModalInfo(null);
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      alert(`❌ Lỗi: ${err.message}`);
    }
  };

  const handleDelete = async (empId, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân viên '${name}' (#${empId})?`)) return;
    try {
      await employeeApi.delete(empId);
      onRefresh();
    } catch (err) {
      alert(`❌ Lỗi khi xóa: ${err.message}`);
    }
  };

  return (
    <div className="card-custom">
      {/* Header Toolbar */}
      <div className="card-heading employee-heading">
        <h2 className="card-title">
          <Users size={20} color="#FD6900" />
          <span>Quản Lý Nhân Viên ({employees.length})</span>
        </h2>

        <div className="employee-actions">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onRefresh}
            title="Tải lại danh sách"
          >
            <RefreshCw size={15} />
            <span className="hide-on-mobile">Làm mới</span>
          </button>

          <button 
            type="button" 
            className="btn-primary employee-add-btn"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowWizard(false);
            }}
          >
            <UserPlus size={16} />
            <span>{showAddForm ? 'Đóng' : 'Thêm Nhân Viên'}</span>
          </button>
        </div>
      </div>

      {/* Form thêm nhân viên */}
      {showAddForm && (
        <div className="employee-form-container">
          <h3 className="form-section-title">
            <UserPlus size={18} />
            <span>Đăng Ký Hồ Sơ Nhân Viên & Quét Mặt AI</span>
          </h3>

          <form onSubmit={(e) => handleSubmit(e, false)}>
            <div className="employee-form-grid">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Mã Nhân Viên</label>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    color: '#10b981', 
                    background: 'rgba(16, 185, 129, 0.12)', 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Lock size={12} /> Tự động cấp
                  </span>
                </div>
                <input 
                  type="text" 
                  className="custom-input" 
                  readOnly
                  disabled
                  value={formData.employee_code || autoCode || (isLoadingCode ? 'Đang cấp mã...' : 'NV001')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--brand-orange, #FD6900)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '1px',
                    cursor: 'not-allowed',
                    border: '1px solid rgba(253, 105, 0, 0.35)',
                    opacity: 0.95
                  }}
                  title="Mã nhân viên do hệ thống tự động sinh để đảm bảo tính duy nhất, người dùng không cần chỉnh sửa"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Họ & Tên *</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="VD: Nguyễn Văn An" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phòng Ban</label>
                <select 
                  className="custom-input"
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                >
                  <option value="Kỹ Thuật / IT">Kỹ Thuật / IT</option>
                  <option value="Kinh Doanh / Sale">Kinh Doanh / Sale</option>
                  <option value="Hành Chính Nhân Sự">Hành Chính Nhân Sự</option>
                  <option value="Kế Toán">Kế Toán</option>
                  <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Số Điện Thoại</label>
                <input 
                  type="text" 
                  className="custom-input" 
                  placeholder="VD: 0987654321" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Phần Nạp Face ID Đa Góc Mặt */}
            <div className="face-enroll-section">
              <div className="face-enroll-header">
                <div>
                  <h4 className="face-enroll-title">
                    <Sparkles size={16} />
                    <span>Dữ Liệu Khuôn Mặt Face ID (5 Góc Tự Động)</span>
                  </h4>
                  <p className="face-enroll-desc">
                    Quét tự động 5 góc mặt (Thẳng/Trái/Phải/Lên/Xuống) × 3 mẫu = 15 vector AI
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primary enroll-launch-btn"
                  onClick={() => setShowWizard(true)}
                >
                  <Camera size={16} />
                  <span>{faceDescriptors.length > 0 ? `Quét Lại (${faceDescriptors.length} Mẫu)` : '📸 Mở Camera Quét 5 Góc'}</span>
                </button>
              </div>

              {/* Status Badge */}
              {faceDescriptors.length > 0 ? (
                <div className="enroll-success-banner">
                  {avatarImage && (
                    <img 
                      src={avatarImage} 
                      alt="Avatar Preview" 
                      className="enroll-avatar-preview"
                    />
                  )}
                  <div className="enroll-success-text">
                    <div className="enroll-success-title">
                      <CheckCircle2 size={15} color="#10b981" />
                      <span>Đã nạp {faceDescriptors.length} mẫu khuôn mặt AI 5 góc (128D)</span>
                    </div>
                    <div className="enroll-success-sub">
                      Sẵn sàng kích hoạt điểm danh Face ID độ chính xác cao.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="enroll-empty-hint">
                  Chưa có dữ liệu khuôn mặt. Bấm nút <strong>"Mở Camera Quét 5 Góc"</strong> ở trên để quét tự động!
                </div>
              )}
            </div>

            {/* Modal / Wizard chụp đa góc */}
            {showWizard && (
              <MultiShotEnrollWizard
                onComplete={handleWizardComplete}
                onCancel={() => setShowWizard(false)}
              />
            )}

            <div className="form-submit-row">
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Hủy
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu Nhân Viên & Kích Hoạt Face ID'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Danh sách nhân viên */}
      {employees.length === 0 ? (
        <div className="empty-state">
          <Users size={44} style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600 }}>Chưa có nhân viên nào trong hệ thống</p>
          <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
            Nhấn nút "Thêm Nhân Viên" ở trên để đăng ký hồ sơ và quét mặt!
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-responsive desktop-only">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Ảnh / Avatar</th>
                  <th>Mã NV</th>
                  <th>Họ & Tên</th>
                  <th>Phòng Ban</th>
                  <th>Chức Vụ</th>
                  <th>Dữ Liệu Face ID</th>
                  <th>Ngày Tạo</th>
                  <th style={{ textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      {emp.avatar_path ? (
                        <img src={emp.avatar_path} alt={emp.full_name} className="table-photo-thumb" />
                      ) : (
                        <div className="table-photo-thumb placeholder">
                          <Users size={18} color="#64748b" />
                        </div>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--brand-blue)', fontFamily: 'var(--font-mono)' }}>
                        {emp.employee_code}
                      </strong>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-main)' }}>{emp.full_name}</strong>
                    </td>
                    <td>{emp.department}</td>
                    <td>{emp.position || 'Nhân viên'}</td>
                    <td>
                      {emp.sample_count > 0 ? (
                        <span className="confidence-tag">
                          ✓ {emp.sample_count} Góc Mặt
                        </span>
                      ) : (
                        <span className="confidence-tag unmatched">
                          Chưa Quét Mặt
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      {emp.created_at || 'Mặc định'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        className="btn-del"
                        onClick={() => handleDelete(emp.id, emp.full_name)}
                        title={`Xóa nhân viên ${emp.full_name}`}
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
          <div className="mobile-only employee-cards-container">
            {employees.map(emp => (
              <div key={emp.id} className="employee-mobile-card">
                <div className="employee-mobile-card-top">
                  {emp.avatar_path ? (
                    <img src={emp.avatar_path} alt={emp.full_name} className="employee-mobile-avatar" />
                  ) : (
                    <div className="employee-mobile-avatar placeholder">
                      <Users size={22} color="#94a3b8" />
                    </div>
                  )}

                  <div className="employee-mobile-info">
                    <div className="employee-mobile-name">{emp.full_name}</div>
                    <div className="employee-mobile-code-dept">
                      <span className="emp-code">{emp.employee_code}</span>
                      <span className="emp-dept">{emp.department}</span>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn-del"
                    onClick={() => handleDelete(emp.id, emp.full_name)}
                    title={`Xóa nhân viên ${emp.full_name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="employee-mobile-card-bottom">
                  <div className="emp-face-status">
                    {emp.sample_count > 0 ? (
                      <span className="confidence-tag">✓ {emp.sample_count} Góc Mặt AI</span>
                    ) : (
                      <span className="confidence-tag unmatched">Chưa Có Face ID</span>
                    )}
                  </div>
                  {emp.phone && (
                    <div className="emp-phone">
                      <Phone size={12} />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Cảnh Báo Trùng Khuôn Mặt */}
      {duplicateModalInfo && (
        <DuplicateFaceModal
          duplicateInfo={duplicateModalInfo}
          newCandidateData={formData}
          onCancel={() => setDuplicateModalInfo(null)}
          onAppendToExisting={handleAppendToExisting}
          onForceCreate={() => handleSubmit(null, true)}
        />
      )}
    </div>
  );
}
