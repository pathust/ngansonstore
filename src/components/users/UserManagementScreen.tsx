import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, UserRole, UserPermissions } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  User,
  Phone,
  Mail,
  Shield,
  Check,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const ALL_PERMISSION_KEYS: { key: keyof UserPermissions; label: string; desc: string }[] = [
  { key: 'canSellPOS', label: 'Bán lẻ & Thu ngân POS', desc: 'Lập hóa đơn và tính tiền cho khách hàng tại quầy' },
  { key: 'canViewInvoices', label: 'Quản lý & Xem hóa đơn', desc: 'Xem danh sách và in lại hóa đơn bán hàng' },
  { key: 'canDeleteInvoices', label: 'Xóa & Hủy hóa đơn', desc: 'Quyền xóa hóa đơn đã xuất (Nguy hiểm)' },
  { key: 'canViewReports', label: 'Báo cáo Doanh thu & Lợi nhuận', desc: 'Xem biểu đồ tài chính và kết quả kinh doanh' },
  { key: 'canManageProducts', label: 'Quản lý Hàng hóa & Cập nhật giá', desc: 'Thêm, sửa giá bán, danh mục sản phẩm' },
  { key: 'canStockIn', label: 'Nhập kho & Giá vốn', desc: 'Tạo phiếu nhập hàng và tính giá vốn bình quân' },
  { key: 'canManageSuppliers', label: 'Quản lý Nhà cung cấp & Công nợ', desc: 'Quản lý thông tin và công nợ đối tác' },
  { key: 'canManageCustomers', label: 'Quản lý Khách hàng & Sổ nợ', desc: 'Theo dõi điểm tích lũy và thu nợ khách hàng' },
  { key: 'canAuditInventory', label: 'Kiểm kê kho hàng', desc: 'Tạo và thực hiện phiếu đếm kho thực tế' },
  { key: 'canBalanceAudit', label: 'Duyệt cân bằng kiểm kê', desc: 'Chốt chênh lệch và điều chỉnh tồn kho tự động' },
  { key: 'canManageCashbook', label: 'Quản lý Sổ quỹ (Thu / Chi)', desc: 'Lập phiếu thu, phiếu chi và xem số dư quỹ' },
  { key: 'canAccessDataCenter', label: 'Trung tâm dữ liệu & Sao lưu', desc: 'Tải và phục hồi dữ liệu hệ thống' },
  { key: 'canEditSystemSettings', label: 'Cài đặt Cửa hàng & VietQR', desc: 'Thay đổi thông tin cửa hàng, tài khoản ngân hàng' },
  { key: 'canManageUsers', label: 'Quản trị nhân sự & Phân quyền', desc: 'Toàn quyền thêm, sửa, khóa nhân viên' },
  { key: 'canImportData', label: 'Nhập Excel từ KiotViet/ERP', desc: 'Nhập danh mục và khách hàng từ file bảng tính' },
];

const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  ADMIN: {
    canViewReports: true,
    canManageProducts: true,
    canStockIn: true,
    canManageSuppliers: true,
    canManageCustomers: true,
    canAuditInventory: true,
    canBalanceAudit: true,
    canManageCashbook: true,
    canAccessDataCenter: true,
    canSellPOS: true,
    canViewInvoices: true,
    canDeleteInvoices: true,
    canEditSystemSettings: true,
    canManageUsers: true,
    canImportData: true,
  },
  MANAGER: {
    canViewReports: true,
    canManageProducts: true,
    canStockIn: true,
    canManageSuppliers: true,
    canManageCustomers: true,
    canAuditInventory: true,
    canBalanceAudit: true,
    canManageCashbook: true,
    canAccessDataCenter: true,
    canSellPOS: true,
    canViewInvoices: true,
    canDeleteInvoices: false,
    canEditSystemSettings: false,
    canManageUsers: false,
    canImportData: false,
  },
  STAFF: {
    canViewReports: false,
    canManageProducts: false,
    canStockIn: false,
    canManageSuppliers: false,
    canManageCustomers: false,
    canAuditInventory: false,
    canBalanceAudit: false,
    canManageCashbook: false,
    canAccessDataCenter: false,
    canSellPOS: true,
    canViewInvoices: true,
    canDeleteInvoices: false,
    canEditSystemSettings: false,
    canManageUsers: false,
    canImportData: false,
  },
};

export const UserManagementScreen: React.FC = () => {
  const {
    users,
    currentUser,
    saveUser,
    deleteUser,
    toggleUserLock,
    resetUserPassword,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Drawer / Modal states
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [resetPassUser, setResetPassUser] = useState<AppUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    username: string;
    password?: string;
    role: UserRole;
    roleTitle: string;
    email: string;
    phone: string;
    avatar: string;
    bio: string;
    status: 'ACTIVE' | 'LOCKED';
    permissions: UserPermissions;
  }>({
    name: '',
    username: '',
    password: '',
    role: 'STAFF',
    roleTitle: 'Nhân viên bán hàng (Cashier / POS)',
    email: '',
    phone: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    bio: '',
    status: 'ACTIVE',
    permissions: { ...DEFAULT_PERMISSIONS.STAFF },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchQuery =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery);
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'STAFF',
      roleTitle: 'Nhân viên bán hàng (Cashier / POS)',
      email: '',
      phone: '',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      bio: '',
      status: 'ACTIVE',
      permissions: { ...DEFAULT_PERMISSIONS.STAFF },
    });
    setIsFormOpen(true);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    const fallbackUsername = u.username || (u.id === 'user-admin-01' ? 'tai' : u.id === 'user-manager-01' ? 'son' : u.id === 'user-manager-02' ? 'ngan' : u.id === 'user-staff-01' ? 'nhatphan' : u.email ? u.email.split('@')[0] : '');
    setFormData({
      id: u.id,
      name: u.name,
      username: fallbackUsername,
      password: '',
      role: u.role,
      roleTitle: u.roleTitle,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      bio: u.bio || '',
      status: u.status || 'ACTIVE',
      permissions: { ...(u.permissions || DEFAULT_PERMISSIONS[u.role] || DEFAULT_PERMISSIONS.STAFF) },
    });
    setIsFormOpen(true);
  };

  const handleRolePreset = (role: UserRole) => {
    const titles: Record<UserRole, string> = {
      ADMIN: 'Full Access Admin (Toàn quyền hệ thống)',
      MANAGER: 'Quản lý cửa hàng (Store Manager)',
      STAFF: 'Nhân viên bán hàng (Cashier / POS)',
    };
    setFormData((prev) => ({
      ...prev,
      role,
      roleTitle: titles[role],
      permissions: { ...DEFAULT_PERMISSIONS[role] },
    }));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập họ và tên nhân viên!', 'warning');
      return;
    }

    if (!editingUser && !formData.password) {
      showToast('Vui lòng thiết lập mật khẩu ban đầu cho nhân viên!', 'warning');
      return;
    }

    const payload: Partial<AppUser> & { name: string } = {
      ...formData,
      name: formData.name.trim(),
      username: formData.username.trim() || formData.email.split('@')[0] || (editingUser?.id === 'user-admin-01' ? 'tai' : editingUser?.id === 'user-manager-01' ? 'son' : editingUser?.id === 'user-manager-02' ? 'ngan' : editingUser?.id === 'user-staff-01' ? 'nhatphan' : `user_${Date.now().toString().slice(-4)}`),
    };
    if (!editingUser && formData.password) {
      payload.password = formData.password;
    } else if (editingUser && !formData.password) {
      delete (payload as any).password;
    }

    const res = await saveUser(payload);
    if (res.success) {
      setIsFormOpen(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser) return;
    if (newPasswordInput.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'warning');
      return;
    }

    const res = await resetUserPassword(resetPassUser.id, newPasswordInput);
    if (res.success) {
      setResetPassUser(null);
      setNewPasswordInput('');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị viên', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'MANAGER':
        return { label: 'Quản lý', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'STAFF':
        return { label: 'Nhân viên', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0B63E5] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              Quản trị Tài khoản & Phân quyền
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý danh sách nhân sự, phân bổ 15 quyền hạn, mật khẩu và trạng thái hoạt động
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm nhân viên mới</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng nhân sự</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">{users.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            {users.length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Quản trị viên</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {users.filter((u) => u.role === 'ADMIN').length}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
            Admin
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Quản lý</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {users.filter((u) => u.role === 'MANAGER').length}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            Manager
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Nhân viên POS</span>
            <p className="text-lg font-extrabold text-slate-900 mt-0.5">
              {users.filter((u) => u.role === 'STAFF').length}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Staff
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, tài khoản, SĐT..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'ADMIN', 'MANAGER', 'STAFF'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === r
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {r === 'ALL' ? 'Tất cả' : r === 'ADMIN' ? 'Quản trị' : r === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredUsers.map((u) => {
          const badge = getRoleBadge(u.role);
          const isLocked = u.status === 'LOCKED';
          const isCurrentLoggedIn = currentUser.id === u.id;
          const isPrimaryAdmin = u.id === 'user-admin-01' || (u.role === 'ADMIN' && u.name.toLowerCase().includes('tài'));

          return (
            <div
              key={u.id}
              className={`bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative ${
                isLocked ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/80 hover:border-blue-200 shadow-2xs'
              }`}
            >
              {/* Top info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isLocked ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 truncate">{u.name}</span>
                      {isCurrentLoggedIn && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">
                          Bạn
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 truncate">{u.roleTitle}</span>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                      <span>Tài khoản: <strong className="text-blue-700">{u.username || (u.id === 'user-admin-01' ? 'tai' : u.id === 'user-manager-01' ? 'son' : u.id === 'user-manager-02' ? 'ngan' : u.id === 'user-staff-01' ? 'nhatphan' : u.email ? u.email.split('@')[0] : 'chưa đặt')}</strong></span>
                      {u.phone && <span>• {u.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  {isLocked && (
                    <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Đã khóa
                    </span>
                  )}
                </div>
              </div>

              {/* Bio if exists */}
              {u.bio && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-2">
                  "{u.bio}"
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(u)}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Chỉnh sửa thông tin & phân quyền"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Sửa & Phân quyền</span>
                  </button>

                  <button
                    onClick={() => {
                      setResetPassUser(u);
                      setNewPasswordInput('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Đặt lại mật khẩu cho nhân viên"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Đặt lại MK</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {!isPrimaryAdmin && (
                    <button
                      onClick={() => toggleUserLock(u.id)}
                      className={`p-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                        isLocked
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                      title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                    >
                      {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {!isPrimaryAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${u.name}"?`)) {
                          deleteUser(u.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                      title="Xóa tài khoản"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal: Add / Edit User */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight">
                    {editingUser ? `Chỉnh sửa: ${editingUser.name}` : 'Thêm tài khoản nhân sự mới'}
                  </h3>
                  <p className="text-[11px] text-blue-100">Thiết lập chức danh, quyền hạn & tài khoản đăng nhập</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 scroll-hide flex-1">
              {/* Role Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Chọn vai trò (Role):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ADMIN', 'MANAGER', 'STAFF'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRolePreset(r)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        formData.role === r
                          ? 'border-blue-600 bg-blue-50/90 text-blue-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <span className="text-xs block">{r === 'ADMIN' ? '👑 Quản trị viên' : r === 'MANAGER' ? '👔 Quản lý' : '🛒 Nhân viên'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên nhân viên: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đăng nhập (Username): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="VD: nguyenvana hoặc nva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                    required
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu khởi tạo: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Tối thiểu 6 ký tự..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại:
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@nganson.vn"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chức danh hiển thị:
                  </label>
                  <input
                    type="text"
                    value={formData.roleTitle}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    placeholder="Nhân viên bán hàng..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Permission Checkboxes */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phân quyền chi tiết (15 phân hệ):
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {Object.values(formData.permissions).filter(Boolean).length} / 15 quyền được cấp
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 max-h-60 overflow-y-auto">
                  {ALL_PERMISSION_KEYS.map((p) => {
                    const isChecked = !!formData.permissions[p.key];
                    return (
                      <label
                        key={p.key}
                        onClick={() => handleTogglePermission(p.key)}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-white border-blue-500 text-blue-900 shadow-2xs'
                            : 'bg-transparent border-slate-200/60 text-slate-500 hover:bg-white/60'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold leading-tight">{p.label}</span>
                          <span className="text-[10px] text-slate-400 leading-snug">{p.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {editingUser ? 'Lưu cập nhật' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-5 overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Đặt lại mật khẩu</span>
              </div>
              <button
                onClick={() => setResetPassUser(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Nhập mật khẩu mới cho nhân viên <strong className="text-slate-900">{resetPassUser.name}</strong>:
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Xác nhận đặt lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
