import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Users, History, Clock, MapPin } from 'lucide-react';
import CameraView from './components/CameraView';
import EmployeeManager from './components/employees/EmployeeManager';
import LogTable from './components/LogTable';
import StatsOverview from './components/StatsOverview';
import CheckinResult from './components/CheckinResult';
import ImageModal from './components/ImageModal';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import GpsCheckinView from './components/GpsCheckinView';
import MiniGpsCard from './components/MiniGpsCard';

import { employeeApi } from './api/employeeApi';
import { checkinApi } from './api/checkinApi';
import { logsApi } from './api/logsApi';
import { systemApi } from './api/systemApi';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'employees' | 'logs' | 'gps'
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ today_count: 0, total_count: 0, total_employees: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Tải danh sách nhân viên
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await employeeApi.getAll();
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Lỗi khi tải danh sách nhân viên:", err);
    }
  }, []);

  // Tải danh sách log điểm danh
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
    fetchLogs();
  }, [fetchEmployees, fetchLogs]);

  // Xử lý gửi Check-in
  const handleCheckinCapture = async (payload) => {
    setIsSubmitting(true);
    try {
      const res = await checkinApi.submit(payload);

      if (res.success && res.data) {
        setLatestResult(res.data);
        fetchLogs();
      }
    } catch (err) {
      console.error("Check-in error:", err);
      alert(`❌ ${err.message || 'Lỗi khi gửi dữ liệu check-in'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa log điểm danh
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

  // Xuất file CSV
  const handleExport = () => {
    window.open(systemApi.getExportUrl(), '_blank');
  };

  // Chuyển sang tab thêm nhân viên khi phát hiện khuôn mặt chưa đăng ký
  const handleOpenAddEmployeeWithFace = (descriptor) => {
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
            <h1 className="brand-title">Face ID AI Check-in & GPS</h1>
            <div className="brand-subtitle">Hệ thống điểm danh nhận diện khuôn mặt AI & Định vị GPS chuẩn Production</div>
          </div>
        </div>

        <div className="header-meta">
          <div className="meta-chip">
            <Clock size={14} color="var(--brand-orange)" />
            <span>
              {currentTime.toLocaleTimeString('vi-VN')} • {currentTime.toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs Navigation (Desktop) */}
      <div className="app-tabs">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera size={18} />
          Camera Điểm Danh Face ID & GPS
        </button>

        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <Users size={18} />
          Quản Lý Nhân Viên ({employees.length})
        </button>

        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'gps' ? 'active' : ''}`}
          onClick={() => setActiveTab('gps')}
        >
          <MapPin size={18} />
          Cấu Hình GPS
        </button>

        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <History size={18} />
          Nhật Ký & Báo Cáo ({logs.length})
        </button>
      </div>

      {/* Stats Summary */}
      <StatsOverview stats={stats} />

      {/* Tab 1: Scanner View */}
      {activeTab === 'scanner' && (
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
      )}

      {/* Tab 2: Employee Management */}
      {activeTab === 'employees' && (
        <EmployeeManager 
          employees={employees}
          onRefresh={fetchEmployees}
          initialDescriptor={initialEnrollDescriptor}
        />
      )}

      {/* Tab 3: GPS Check-in */}
      {activeTab === 'gps' && (
        <GpsCheckinView 
          employees={employees}
        />
      )}

      {/* Tab 4: Detailed Logs */}
      {activeTab === 'logs' && (
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

      {/* Mobile Bottom Navigation Bar (Phone Screens) */}
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
        </div>
      </nav>
    </div>
  );
}
