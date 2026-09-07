import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, X, AlertCircle } from 'lucide-react';
import { authApi } from '../api/authApi';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.login(username.trim(), password);
      if (res.success) {
        onLoginSuccess(res.user);
        onClose();
        setPassword('');
      } else {
        setErrorMsg(res.message || 'Tài khoản hoặc mật khẩu không đúng!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Tài khoản hoặc mật khẩu không chính xác!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        animation: 'fadeInUp 0.25s ease-out'
      }}>
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #FD6900 0%, #FF8533 100%)',
          padding: '24px 24px 20px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button 
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>

          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <ShieldCheck size={26} color="#ffffff" />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Đăng Nhập Quản Trị
          </h3>
          <p style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px', margin: 0 }}>
            Khu vực dành riêng cho quản lý nhân sự & cấu hình
          </p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '16px',
              border: '1px solid #fecdd3'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '6px'
            }}>
              Tài Khoản
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}>
                <User size={18} />
              </div>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tài khoản admin..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border 0.2s',
                  boxSizing: 'border-box'
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '6px'
            }}>
              Mật Khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}>
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border 0.2s',
                  boxSizing: 'border-box'
                }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#475569',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #FD6900 0%, #FF8533 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(253, 105, 0, 0.3)'
              }}
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
