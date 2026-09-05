import React, { useState } from 'react';
import { useAuth } from '../../context/slices/AuthContext';
import {
  X,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, changePassword } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!oldPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu hiện tại!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ!');
      } else {
        onClose();
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Đổi mật khẩu tài khoản</h3>
              <p className="text-[11px] text-blue-100">
                {currentUser.name} • {currentUser.roleTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* User Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</span>
              <span className="text-[11px] text-slate-500 truncate">
                Tài khoản: <strong className="font-mono text-blue-600">{currentUser.username || currentUser.email || 'tai'}</strong>
              </span>
            </div>
          </div>

          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu hiện tại: <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Nhập mật khẩu đang dùng..."
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu mới: <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Tối thiểu 6 ký tự..."
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-1 text-[10px] flex items-center gap-1">
                {newPassword.length >= 6 ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Đủ độ dài yêu cầu
                  </span>
                ) : (
                  <span className="text-rose-500">
                    Cần thêm {6 - newPassword.length} ký tự nữa
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Xác nhận mật khẩu mới: <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {confirmPassword && (
              <div className="mt-1 text-[10px]">
                {confirmPassword === newPassword ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Mật khẩu khớp
                  </span>
                ) : (
                  <span className="text-rose-500">Mật khẩu xác nhận không khớp</span>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
