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
  X,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, storeSettings } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

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

    const term = username.trim();
    if (!term) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc email!');
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
        setErrorMessage(res.error || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi kết nối máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-950 via-slate-900 to-[#0A192F] flex flex-col justify-between sm:justify-center items-center sm:p-6 relative overflow-x-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] rounded-full bg-indigo-600/20 blur-[100px] pointer-events-none" />

      {/* Mobile Top Brand Hero (Visible on Mobile) */}
      <div className="w-full pt-10 pb-6 px-4 text-center text-white sm:hidden z-10 shrink-0">
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-2xl flex items-center justify-center ring-4 ring-white/20">
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
        <h1 className="text-xl font-black tracking-tight uppercase">
          {storeSettings?.name || 'Cửa hàng Ngân Sơn'}
        </h1>
        <p className="text-xs text-blue-200 font-medium mt-1">
          318 Vũ Quang, TP. Hà Tĩnh
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-blue-100 mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hệ thống Quản lý Bán hàng & Kho</span>
        </div>
      </div>

      {/* Main Login Card: Expands gracefully on Mobile, Elegant Modal on Desktop */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border-t sm:border border-slate-100 overflow-hidden z-10 flex-1 sm:flex-initial flex flex-col justify-between transition-all">
        {/* Desktop Top Header Banner (Hidden on Mobile) */}
        <div className="hidden sm:block bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 pt-8 pb-7 text-white text-center relative">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center ring-4 ring-white/20">
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
        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Vui lòng nhập tài khoản và mật khẩu được cấp để truy cập hệ thống.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account / Username / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tài khoản hoặc Email:
              </label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Nhập username hoặc email..."
                  className="w-full pl-11 pr-9 h-12 sm:h-12 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  autoComplete="username"
                  required
                />
                {username && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsername('');
                      setErrorMessage('');
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mật khẩu:
                </label>
                {capsLockActive && (
                  <span className="text-[11px] text-amber-600 font-semibold animate-pulse">
                    ⚠️ CapsLock đang bật
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5 text-slate-400" />
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
                  className="w-full pl-11 pr-11 h-12 sm:h-12 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
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
              className="w-full h-12 sm:h-12 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-black text-base sm:text-sm rounded-xl shadow-md hover:shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3"
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

          {/* Clean Security Note */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Hệ thống xác thực bảo mật nội bộ • Cửa hàng Ngân Sơn
            </p>
          </div>
        </div>
      </div>

      {/* Security & Copyright Footer */}
      <div className="py-4 text-center text-xs text-slate-400/80 flex items-center justify-center gap-1.5 z-10 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Bản quyền © 2026 Ngân Sơn Store POS</span>
      </div>
    </div>
  );
};
