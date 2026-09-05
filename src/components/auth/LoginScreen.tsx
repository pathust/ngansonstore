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
  Sparkles,
  KeyRound,
  Check,
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

  // Quick autofill preset (username/email + password)
  const handleAutofillAccount = (u: AppUser) => {
    setSelectedUser(u);
    const uname = u.username || u.email || u.name;
    setUsername(uname);
    setErrorMessage('');

    let pwd = u.password;
    if (!pwd) {
      if (u.id === 'user-admin-01' || uname === 'tai') pwd = 'admin123';
      else if (u.id === 'user-manager-01' || uname === 'son') pwd = 'minhson318vuquang';
      else if (u.id === 'user-manager-02' || uname === 'ngan') pwd = 'ngan318vuquang';
      else if (u.id === 'user-staff-01' || uname === 'nhat') pwd = 'minhnhat318vuquang';
      else pwd = '123456';
    }
    setPassword(pwd);
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
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-950 via-slate-900 to-[#0B1E3B] flex flex-col justify-between sm:justify-center items-center sm:p-6 relative overflow-x-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-blue-600/25 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-indigo-600/25 blur-[100px] pointer-events-none" />

      {/* Mobile Top Brand Hero (Visible on Mobile) */}
      <div className="w-full pt-6 pb-4 px-4 text-center text-white sm:hidden z-10 shrink-0">
        <div className="flex justify-center mb-2.5">
          <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-xl flex items-center justify-center ring-4 ring-white/20">
            <img
              src="/logo.png"
              alt="Ngân Sơn"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
        <h1 className="text-lg font-black tracking-tight uppercase">
          {storeSettings?.name || 'Cửa hàng Ngân Sơn'}
        </h1>
        <p className="text-[11px] text-blue-200 font-medium mt-0.5">
          318 Vũ Quang, TP. Hà Tĩnh
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-blue-100 mt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ thống Quản lý Bán hàng & Kho</span>
        </div>
      </div>

      {/* Main Login Card: Expands gracefully on Mobile, Elegant Modal on Desktop */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t sm:border border-slate-100 overflow-hidden z-10 flex-1 sm:flex-initial flex flex-col justify-between transition-all">
        {/* Desktop Top Header Banner (Hidden on Mobile) */}
        <div className="hidden sm:block bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 pt-7 pb-6 text-white text-center relative">
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
        <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4 sm:space-y-5">
          {/* Quick User Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Chọn người trực ca:
              </label>
              <span className="text-[11px] text-blue-600 font-semibold">Chạm để chọn</span>
            </div>

            {/* 4 Cards Grid - Touch Optimized */}
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => {
                const isSelected =
                  selectedUser?.id === u.id ||
                  username.toLowerCase() === (u.username?.toLowerCase() || u.name.toLowerCase()) ||
                  username.toLowerCase() === (u.email?.toLowerCase() || '');

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUserChip(u)}
                    className={`relative flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all active:scale-97 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/90 text-blue-900 ring-2 ring-blue-500/40 shadow-xs'
                        : 'border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
                      />
                      {isSelected && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center ring-2 ring-white">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate leading-tight">{u.name}</span>
                      <span className="text-[10px] text-slate-500 truncate mt-0.5">
                        {u.role === 'ADMIN'
                          ? 'Quản trị viên'
                          : u.role === 'MANAGER'
                          ? 'Quản lý cửa hàng'
                          : 'Nhân viên thu ngân'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Account / Username / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tài khoản đăng nhập:
              </label>
              <div className="relative flex items-center">
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
                  className="w-full pl-10 pr-3 h-12 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Mật khẩu:
                </label>
                {capsLockActive && (
                  <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                    ⚠️ CapsLock đang bật
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
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
                  className="w-full pl-10 pr-11 h-12 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" /> : <Eye className="w-5 h-5 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-in fade-in font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 sm:h-12 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-black text-sm sm:text-sm rounded-xl shadow-md hover:shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Autofill Preset Section for Staff & Testing */}
          <div className="pt-2 border-t border-slate-100">
            <details className="text-[11px] text-slate-500 cursor-pointer group">
              <summary className="hover:text-blue-600 transition-colors list-none font-bold flex items-center justify-center gap-1 py-1">
                <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                <span>Bấm vào đây để điền nhanh tài khoản mẫu</span>
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleAutofillAccount(u)}
                    className="p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-left transition-colors flex flex-col active:scale-95"
                  >
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="font-bold text-[11px] text-slate-800 truncate">{u.name.split(' ').slice(-2).join(' ')}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono truncate">{u.username}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Security & Copyright Footer */}
      <div className="py-4 text-center text-xs text-slate-400/80 flex items-center justify-center gap-1.5 z-10 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Bảo mật nội bộ • Cửa hàng Ngân Sơn v4.3</span>
      </div>
    </div>
  );
};
