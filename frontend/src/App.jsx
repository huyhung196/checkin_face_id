import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Users, History, Clock, MapPin, Lock, ShieldCheck, LogOut } from 'lucide-react';
import CameraView from './components/CameraView';
import EmployeeManager from './components/employees/EmployeeManager';
import LogTable from './components/LogTable';
import StatsOverview from './components/StatsOverview';
import CheckinResult from './components/CheckinResult';
import ImageModal from './components/ImageModal';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import GpsCheckinView from './components/GpsCheckinView';
import MiniGpsCard from './components/MiniGpsCard';
import AdminLoginModal from './components/AdminLoginModal';

import { employeeApi } from './api/employeeApi';
import { checkinApi } from './api/checkinApi';
import { logsApi } from './api/logsApi';
import { systemApi } from './api/systemApi';
import { authApi } from './api/authApi';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'employees' | 'logs' | 'gps'
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ today_count: 0, total_count: 0, total_employees: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Phân quyền Quản trị (Admin)
  const [isAdmin, setIsAdmin] = useState(authApi.isAuthenticated());
  const [adminUser, setAdminUser] = useState(authApi.getUser());
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [modalItem, setModalItem] = useState(null);
  const [search, setSearch] = useState('');
  const [initialEnrollDescriptor, setInitialEnrollDescriptor] = useState(null);

  // Cập nhật đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Xác thực phiên làm việc Admin khi mở trang
  useEffect(() => {
    authApi.verifySession().then(res => {
      setIsAdmin(res.authenticated);
      if (res.authenticated) {
        setAdminUser(authApi.getUser());
      } else {
        setAdminUser(null);
      }
    });
  }, []);

  // Tải danh sách nhân viên
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeeApi.getAll();
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách nhân viên:", err);
    }
  }, []);

  // Tải danh sách log điểm danh (chỉ cần khi là Admin)
  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const res = await logsApi.getLogs({ search });
      setLogs(res.data || []);
      setStats({
        today_count: res.today_count || 0,
        total_count: res.total_count || 0,
        total_employees: res.total_employees || 0
      });
    } catch (err) {
      console.error("Lỗi khi tải logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [search]);

  useEffect(() => {
    fetchEmployees();
    if (isAdmin) {
      fetchLogs();
    }
  }, [fetchEmployees, fetchLogs, isAdmin]);

  // Xử lý gửi Điểm danh
  const handleCheckinCapture = async (payload) => {
    setIsSubmitting(true);
    try {
      const res = await checkinApi.submit(payload);

      if (res.success && res.data) {
        setLatestResult(res.data);
        if (isAdmin) {
          fetchLogs();
        }
      } else {
        setLatestResult(null);
        alert(`❌ ${res.message || "Không nhận diện được nhân viên! Người lạ không được phép điểm danh."}`);
      }
    } catch (err) {
      console.error("Check-in error:", err);
      setLatestResult(null);
      alert(`❌ ${err.message || 'Lỗi khi gửi dữ liệu điểm danh'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Đăng nhập Admin thành công
  const handleLoginSuccess = (user) => {
    setIsAdmin(true);
    setAdminUser(user);
    fetchLogs();
    fetchEmployees();
  };

  // Đăng xuất Admin (Nhanh chóng, mượt mà)
  const handleLogout = async () => {
    await authApi.logout();
    setIsAdmin(false);
    setAdminUser(null);
    setActiveTab('scanner');
  };

  // Xóa log điểm danh (Admin)
  const handleDeleteLog = async (id) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa log #${id}?`)) return;
    try {
      await logsApi.deleteLog(id);
      fetchLogs();
      if (latestResult && latestResult.id === id) {
        setLatestResult(null);
      }
    } catch (err) {
      console.error("Lỗi khi xóa log:", err);
    }
  };

  // Xuất file CSV (Admin)
  const handleExport = () => {
    window.open(systemApi.getExportUrl(), '_blank');
  };

  // Chuyển sang tab thêm nhân viên khi phát hiện khuôn mặt chưa đăng ký (Admin)
  const handleOpenAddEmployeeWithFace = (descriptor) => {
    if (!isAdmin) {
      setShowLoginModal(true);
      return;
    }
    setInitialEnrollDescriptor(descriptor);
    setActiveTab('employees');
  };

  return (
    <div className="app-container">
      {/* PWA Install Banner */}
      <PwaInstallPrompt />

      {/* Header */}
      <header className="glass-card app-header">
        <div className="header-brand">
          <img src="/logo-icon.svg" alt="Project Logo" className="brand-logo-img" />
          <div>
            <h1 className="brand-title">Điểm Danh AI</h1>
            <div className="brand-subtitle">Hệ thống chấm công Mebieco</div>
          </div>
        </div>

        <div className="header-meta">
          <div className="meta-chip">
            <Clock size={14} color="var(--brand-orange)" />
            <span>
              {currentTime.toLocaleTimeString('vi-VN')} • {currentTime.toLocaleDateString('vi-VN')}
            </span>
          </div>

          {/* Nút Đăng Nhập / Đăng Xuất Quản Trị */}
          {!isAdmin ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowLoginModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <Lock size={15} color="var(--brand-orange)" />
              <span>Quản Trị</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ 
                fontSize: '0.8rem', 
                backgroundColor: 'rgba(253, 105, 0, 0.1)', 
                color: 'var(--brand-orange)', 
                padding: '5px 10px', 
                borderRadius: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                <ShieldCheck size={15} /> Admin
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
                title="Đăng xuất khỏi quyền Quản trị"
              >
                <LogOut size={14} />
                <span className="hide-on-mobile">Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="app-tabs">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera size={18} />
          <span>Điểm Danh</span>
        </button>

        {/* Các Tab Quản Trị: Chỉ hiển thị khi đã đăng nhập Admin */}
        {isAdmin && (
          <>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
            >
              <Users size={18} />
              <span>Nhân Viên ({employees.length})</span>
            </button>

            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'gps' ? 'active' : ''}`}
              onClick={() => setActiveTab('gps')}
            >
              <MapPin size={18} />
              <span>Cấu Hình GPS</span>
            </button>

            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <History size={18} />
              <span>Nhật Ký & Báo Cáo ({logs.length})</span>
            </button>
          </>
        )}
      </div>

      {/* Thống kê nhanh: Chỉ hiển thị cho Admin */}
      {isAdmin && <StatsOverview stats={stats} />}

      {/* Tab 1: Màn hình Điểm Danh (Dành cho tất cả mọi người) */}
      {activeTab === 'scanner' && (
        isAdmin ? (
          /* Bố cục Admin: 2 cột đầy đủ */
          <div className="main-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CameraView 
                employees={employees}
                onCapture={handleCheckinCapture}
                isSubmitting={isSubmitting}
                onOpenAddEmployee={handleOpenAddEmployeeWithFace}
              />
              <CheckinResult result={latestResult} onImageClick={setModalItem} />
            </div>

            <div>
              <MiniGpsCard onOpenGpsSetup={() => setActiveTab('gps')} />
              <LogTable 
                logs={logs}
                isLoading={isLoadingLogs}
                onRefresh={fetchLogs}
                onDelete={handleDeleteLog}
                onImageClick={setModalItem}
                search={search}
                setSearch={setSearch}
                onExport={handleExport}
              />
            </div>
          </div>
        ) : (
          /* Bố cục Nhân Viên: Căn giữa tinh gọn 100%, không lộ log hay cài đặt */
          <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
            <CameraView 
              employees={employees}
              onCapture={handleCheckinCapture}
              isSubmitting={isSubmitting}
              onOpenAddEmployee={null}
            />
            <CheckinResult result={latestResult} onImageClick={setModalItem} />
          </div>
        )
      )}

      {/* Tab 2: Quản lý nhân viên (Chỉ Admin) */}
      {isAdmin && activeTab === 'employees' && (
        <EmployeeManager 
          employees={employees}
          onRefresh={fetchEmployees}
          initialDescriptor={initialEnrollDescriptor}
        />
      )}

      {/* Tab 3: Cấu hình GPS (Chỉ Admin) */}
      {isAdmin && activeTab === 'gps' && (
        <GpsCheckinView 
          employees={employees}
        />
      )}

      {/* Tab 4: Báo cáo & Lịch sử (Chỉ Admin) */}
      {isAdmin && activeTab === 'logs' && (
        <LogTable 
          logs={logs}
          isLoading={isLoadingLogs}
          onRefresh={fetchLogs}
          onDelete={handleDeleteLog}
          onImageClick={setModalItem}
          search={search}
          setSearch={setSearch}
          onExport={handleExport}
        />
      )}

      {/* Image Modal */}
      <ImageModal item={modalItem} onClose={() => setModalItem(null)} />

      {/* Modal Đăng Nhập Quản Trị */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Mobile Bottom Navigation Bar (Màn hình điện thoại) */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-nav-items">
          <button 
            type="button" 
            className={`mobile-nav-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            <Camera size={20} />
            <span>Điểm Danh</span>
          </button>

          {isAdmin ? (
            <>
              <button 
                type="button" 
                className={`mobile-nav-btn ${activeTab === 'gps' ? 'active' : ''}`}
                onClick={() => setActiveTab('gps')}
              >
                <MapPin size={20} />
                <span>GPS</span>
              </button>

              <button 
                type="button" 
                className={`mobile-nav-btn ${activeTab === 'employees' ? 'active' : ''}`}
                onClick={() => setActiveTab('employees')}
              >
                <Users size={20} />
                <span>Nhân Viên</span>
              </button>

              <button 
                type="button" 
                className={`mobile-nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                <History size={20} />
                <span>Nhật Ký</span>
              </button>
            </>
          ) : (
            <button 
              type="button" 
              className="mobile-nav-btn"
              onClick={() => setShowLoginModal(true)}
            >
              <Lock size={20} />
              <span>Quản Trị</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
