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
  Phone,
  Store,
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

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

  const storeName = storeSettings?.name || 'CỬA HÀNG ĐIỆN NƯỚC & KIM KHÍ NGÂN SƠN';
  const storeAddress = storeSettings?.address || '318 Vũ Quang, TP. Hà Tĩnh';

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 md:bg-gradient-to-br md:from-slate-100 md:via-blue-50/40 md:to-indigo-50/50 flex flex-col justify-start md:justify-center items-center md:p-6 select-none font-sans overflow-x-hidden">
      {/* Main Container: Full viewport height and edge-to-edge on Mobile, Centered Elegant Card on Tablet/Desktop */}
      <div className="w-full md:max-w-[440px] min-h-[100dvh] md:min-h-0 flex flex-col justify-between bg-white md:rounded-3xl md:shadow-2xl md:border md:border-slate-200/80 overflow-y-auto md:overflow-hidden">
        
        {/* Top Hero Brand Header */}
        <div className="bg-gradient-to-br from-[#0B63E5] via-[#155DFC] to-[#1E40AF] px-6 pt-10 pb-8 md:pt-8 md:pb-7 text-white text-center relative overflow-hidden shrink-0 shadow-sm">
          {/* Subtle Ambient Shapes */}
          <div className="absolute top-[-50%] left-[-20%] w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-[-30%] right-[-20%] w-52 h-52 bg-indigo-900/30 rounded-full blur-2xl pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex justify-center mb-3.5">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white p-2.5 shadow-xl ring-4 ring-white/20 flex items-center justify-center transition-transform duration-200 active:scale-95">
              <img
                src={logoImg}
                alt="Ngân Sơn Store"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="hidden only:flex w-full h-full rounded-xl bg-blue-600 text-white font-black text-xl items-center justify-center">
                NS
              </div>
            </div>
          </div>

          {/* Store Name & Subtitle */}
          <div className="relative z-10 space-y-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight uppercase leading-snug drop-shadow-xs">
              {storeName}
            </h1>
            <p className="text-xs text-blue-100 font-medium">
              {storeAddress}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold text-white backdrop-blur-xs">
                <Store className="w-3.5 h-3.5 text-blue-200" />
                <span>Hệ thống Quản lý Bán hàng & Kho</span>
              </span>
            </div>
          </div>
        </div>

        {/* Form Body - Overlapping rounded card on mobile, integrated on desktop */}
        <div className="flex-1 bg-white rounded-t-[28px] md:rounded-t-none -mt-4 md:mt-0 px-6 pt-7 pb-8 md:p-8 flex flex-col justify-between shadow-xs relative z-10">
          <div className="space-y-6">
            {/* Form Title & Instruction */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Đăng nhập
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Nhập tài khoản nhân viên hoặc quản lý để bắt đầu ca làm việc.
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="login-username-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Tài khoản hoặc Email:
                </label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    id="login-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="Nhập username hoặc email..."
                    className="w-full box-border block pl-11 pr-10 h-13 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                  {username && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('');
                        setErrorMessage('');
                      }}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      aria-label="Xóa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password-input"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Mật khẩu:
                  </label>
                  {capsLockActive && (
                    <span className="text-[11px] text-amber-600 font-semibold animate-pulse">
                      ⚠️ CapsLock bật
                    </span>
                  )}
                </div>
                <div className="relative w-full">
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
                    className="w-full box-border block pl-11 pr-12 h-13 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 active:text-blue-600 cursor-pointer p-1"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs animate-in fade-in font-medium leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Big Thumb-Friendly Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-13 px-4 bg-gradient-to-r from-[#0B63E5] to-[#1D4ED8] hover:from-[#0952C4] hover:to-[#1E40AF] active:scale-[0.99] text-white font-black text-base rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 stroke-[2.5]" />
                    <span>Đăng nhập hệ thống</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Security & Help Footer */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center space-y-2 pb-6 md:pb-0">
            <p className="text-xs text-slate-500 font-medium">
              Quên thông tin tài khoản?{' '}
              <a
                href="tel:0912345678"
                className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                <span>0912.345.678</span>
              </a>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bảo mật nội bộ • Cửa hàng Ngân Sơn POS v4.3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
