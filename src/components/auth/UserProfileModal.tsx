import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Phone,
  Mail,
  ShieldCheck,
  KeyRound,
  LogOut,
  Save,
  CheckCircle2,
  FileText,
  Lock,
} from 'lucide-react';

import { AvatarUploader } from '../common/AvatarUploader';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChangePassword?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenChangePassword,
}) => {
  const { currentUser, updateUserProfile, logout, setIsChangePasswordOpen } = useApp();

  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile({
        name: name.trim() || currentUser.name,
        phone: phone.trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerChangePassword = () => {
    onClose();
    if (onOpenChangePassword) {
      onOpenChangePassword();
    } else {
      setIsChangePasswordOpen(true);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc này?')) {
      onClose();
      logout();
    }
  };

  const permissionTags = [
    { key: 'canSellPOS', label: 'Bán lẻ POS', active: currentUser.permissions?.canSellPOS },
    { key: 'canViewInvoices', label: 'Xem & In hóa đơn', active: currentUser.permissions?.canViewInvoices },
    { key: 'canViewReports', label: 'Xem Báo cáo', active: currentUser.permissions?.canViewReports },
    { key: 'canManageProducts', label: 'Quản lý Hàng hóa', active: currentUser.permissions?.canManageProducts },
    { key: 'canStockIn', label: 'Nhập kho', active: currentUser.permissions?.canStockIn },
    { key: 'canManageCashbook', label: 'Quản lý Sổ quỹ', active: currentUser.permissions?.canManageCashbook },
    { key: 'canManageCustomers', label: 'Khách hàng', active: currentUser.permissions?.canManageCustomers },
    { key: 'canManageSuppliers', label: 'Nhà cung cấp', active: currentUser.permissions?.canManageSuppliers },
    { key: 'canAuditInventory', label: 'Kiểm kê kho', active: currentUser.permissions?.canAuditInventory },
    { key: 'canManageUsers', label: 'Quản trị nhân sự', active: currentUser.permissions?.canManageUsers },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Hồ sơ cá nhân & Tài khoản</h3>
              <p className="text-xs text-blue-100">Cửa hàng Ngân Sơn • 318 Vũ Quang</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 scroll-hide flex-1">
          {/* User Profile Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100">
            <AvatarUploader
              currentAvatar={avatar || currentUser.avatar}
              userName={currentUser.name}
              onAvatarChange={(newAvatar) => setAvatar(newAvatar)}
              size="lg"
              editable={true}
            />
            <div className="flex flex-col min-w-0 text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-base font-extrabold text-slate-900 truncate">{currentUser.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                  {currentUser.role}
                </span>
              </div>
              <span className="text-xs text-slate-600 font-medium mt-0.5">{currentUser.roleTitle}</span>
              <span className="text-[11px] text-slate-500 mt-1 font-mono">
                Tài khoản đăng nhập: <strong className="text-blue-700">{currentUser.username || 'tai'}</strong>
              </span>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@nganson.vn"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú / Giới thiệu:
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Ghi chú về phân công công việc hoặc thông tin liên hệ..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
              />
            </div>

            {/* Permissions list */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Quyền hạn được cấp phép:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {permissionTags.map((p) => (
                  <span
                    key={p.key}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${
                      p.active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    {p.active ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3" />}
                    {p.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu hồ sơ cá nhân'}</span>
              </button>
            </div>
          </form>

          {/* Quick Account Security Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTriggerChangePassword}
              className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
            >
              <KeyRound className="w-4 h-4" />
              <span>Đổi mật khẩu</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
