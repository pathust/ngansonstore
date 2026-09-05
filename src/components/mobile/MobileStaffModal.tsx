import React, { useState } from 'react';
import {
  X,
  Users,
  Plus,
  ShieldCheck,
  Phone,
  UserCheck,
  CheckCircle2,
  Trash2,
  KeyRound,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppUser, UserRole } from '../../types';

interface MobileStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileStaffModal: React.FC<MobileStaffModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { users, currentUser, saveUser, toggleUserLock, resetUserPassword, deleteUser, showToast } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STAFF');

  // Reset password state
  const [resetTargetUser, setResetTargetUser] = useState<AppUser | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  if (!isOpen) return null;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Vui lòng nhập tên nhân viên!', 'warning');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu tối thiểu 6 ký tự!', 'warning');
      return;
    }

    const usernameVal = newUsername.trim() || `user_${Date.now().toString().slice(-4)}`;
    const roleTitleMap: Record<UserRole, string> = {
      ADMIN: 'Quản trị viên',
      MANAGER: 'Quản lý cửa hàng',
      STAFF: 'Nhân viên bán hàng',
    };

    const res = await saveUser({
      name: newName.trim(),
      username: usernameVal,
      password: newPassword,
      phone: newPhone.trim(),
      role: newRole,
      roleTitle: roleTitleMap[newRole],
    });

    if (res.success) {
      setIsAdding(false);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewPhone('');
      setNewRole('STAFF');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (resetPasswordInput.length < 6) {
      showToast('Mật khẩu tối thiểu 6 ký tự!', 'warning');
      return;
    }

    const res = await resetUserPassword(resetTargetUser.id, resetPasswordInput);
    if (res.success) {
      setResetTargetUser(null);
      setResetPasswordInput('');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị viên', bg: 'bg-purple-100 text-purple-700' };
      case 'MANAGER':
        return { label: 'Quản lý', bg: 'bg-blue-100 text-blue-700' };
      case 'STAFF':
        return { label: 'Thu ngân / POS', bg: 'bg-emerald-100 text-emerald-700' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isAdding ? 'Thêm nhân viên mới' : 'Nhân viên & Phân quyền'}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {isAdding ? 'Tạo tài khoản và cấp quyền' : `${users.length} nhân sự hệ thống`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {resetTargetUser ? (
            /* Reset Password Form */
            <form onSubmit={handleResetPassword} className="bg-slate-50 p-4 rounded-2xl border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-800">
                  Đặt lại mật khẩu cho: {resetTargetUser.name}
                </span>
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Hủy
                </button>
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Mật khẩu mới (tối thiểu 6 ký tự):</label>
                <input
                  type="password"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-purple-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xác nhận đổi mật khẩu
              </button>
            </form>
          ) : isAdding ? (
            /* Add Staff Form */
            <form onSubmit={handleAddStaff} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tên nhân viên *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Lê Thị Hằng"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tên đăng nhập (Username) *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Ví dụ: hanglt"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0066FF] font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu ban đầu *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0066FF]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="09xx.xxx.xxx"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vai trò hệ thống</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['STAFF', 'MANAGER', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        newRole === r
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {r === 'ADMIN' ? 'Admin' : r === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#0066FF] text-white font-bold text-xs shadow-md active:scale-98"
                >
                  Lưu nhân viên
                </button>
              </div>
            </form>
          ) : (
            /* Staff List */
            <div className="flex flex-col gap-2.5">
              {users.map((u) => {
                const badge = getRoleBadge(u.role);
                const isLocked = u.status === 'LOCKED';
                const isPrimary = u.id === 'user-admin-01' || u.role === 'ADMIN';

                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-2xl bg-white border flex flex-col gap-2.5 ${
                      isLocked ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900">{u.name}</span>
                            {currentUser.id === u.id && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1 rounded">Bạn</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Tài khoản: <strong className="text-slate-700">{u.username || 'tai'}</strong> {u.phone && `• ${u.phone}`}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Actions Bar for each user */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setResetTargetUser(u);
                          setResetPasswordInput('');
                        }}
                        className="text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Đặt lại MK</span>
                      </button>

                      {!isPrimary && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleUserLock(u.id)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                              isLocked
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Xóa nhân viên ${u.name}?`)) {
                                deleteUser(u.id);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isAdding && !resetTargetUser && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm nhân viên mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
