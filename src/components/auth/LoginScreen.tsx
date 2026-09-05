import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { AppUser } from '../../types';

export const LoginScreen: React.FC = () => {
  const { users, login, storeSettings } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  // Quick select user chip
  const handleSelectUserChip = (u: AppUser) => {
    setSelectedUser(u);
    setUsername(u.username || u.email || u.name);
    setErrorMessage('');
    const pwdInput = document.getElementById('login-password-input');
    if (pwdInput) {
      pwdInput.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const term = username.trim() || (selectedUser ? (selectedUser.username || selectedUser.email) : '');
    if (!term) {
      setErrorMessage('Vui lòng chọn hoặc nhập tên đăng nhập!');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu đăng nhập!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(term, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại mật khẩu!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi kết nối máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/80 overflow-hidden z-10 transition-all">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 pt-7 pb-6 text-white text-center relative">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-lg flex items-center justify-center ring-4 ring-white/20">
              <img
                src="/logo.png"
                alt="Cửa hàng Ngân Sơn"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight uppercase">
            {storeSettings?.name || 'Cửa hàng Ngân Sơn'}
          </h1>
          <p className="text-xs text-blue-100 font-medium mt-1">
            Hệ thống Quản lý Bán hàng & Kho vật tư • 318 Vũ Quang
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7">
          {/* Quick User Selection Chips */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Chọn nhanh tài khoản trực ca:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id || username.toLowerCase() === (u.username?.toLowerCase() || u.name.toLowerCase());
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUserChip(u)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/90 text-blue-900 ring-2 ring-blue-500/30 shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/90 text-slate-700'
                    }`}
                  >
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover border border-white shadow-2xs shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate leading-tight">{u.name}</span>
                      <span className="text-[10px] text-slate-500 truncate">{u.roleTitle.split('(')[0].trim()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Account Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tài khoản đăng nhập:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Nhập tên đăng nhập hoặc email..."
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mật khẩu:
                </label>
                {capsLockActive && (
                  <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                    ⚠️ CapsLock đang bật
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực tài khoản...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Account Hint for Convenience */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <details className="text-[11px] text-slate-400 cursor-pointer group">
              <summary className="hover:text-slate-600 transition-colors list-none font-medium flex items-center justify-center gap-1">
                <span>Danh sách tài khoản trực ca</span>
              </summary>
              <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-left text-[11px] text-slate-600 space-y-1.5 font-mono">
                <div className="flex flex-col border-b border-slate-200/60 pb-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">👑 Tài (Admin):</span>
                    <span className="font-semibold text-blue-600">tai / admin123</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Email: taiphananh28@gmail.com</span>
                </div>
                <div className="flex flex-col border-b border-slate-200/60 pb-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">👔 Sơn (Quản lý):</span>
                    <span className="font-semibold text-blue-600">son / minhson318vuquang</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Email: sn.phanminh@gmail.com</span>
                </div>
                <div className="flex flex-col border-b border-slate-200/60 pb-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">💼 Ngân (Quản lý):</span>
                    <span className="font-semibold text-blue-600">ngan / ngan318vuquang</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Email: ngansonlv@gmail.com</span>
                </div>
                <div className="flex flex-col pb-0.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">🛒 Nhật (Thu ngân):</span>
                    <span className="font-semibold text-blue-600">nhat / minhnhat318vuquang</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Email: nhatphanminh2711@gmail.com</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Security & Copyright Footer */}
      <div className="mt-6 text-center text-xs text-slate-400/80 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Hệ thống bảo mật xác thực nội bộ • Ngân Sơn POS v4.3</span>
      </div>
    </div>
  );
};
