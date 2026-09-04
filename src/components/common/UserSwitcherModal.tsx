import React, { useEffect,  useState  } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, UserRole } from '../../types';
import {
  X,
  Check,
  ShieldCheck,
  Users,
  Lock,
  Unlock,
  Building2,
  BarChart3,
  Warehouse,
  Receipt,
  ReceiptText,
  Package,
  Database,
  ShoppingCart,
  ChevronRight,
  Upload,
} from 'lucide-react';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const { users, currentUser, switchUser, showToast } = useApp();
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<AppUser>(currentUser);

  if (!isOpen) return null;

  const handleSelectUser = (user: AppUser) => {
    switchUser(user.id);
    setSelectedUserForDetail(user);
    showToast(`Đã chuyển phiên làm việc sang: ${user.name} (${user.roleTitle})`, 'success');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Full Access Admin',
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          dot: 'bg-purple-600',
        };
      case 'MANAGER':
        return {
          label: 'Quản lý cửa hàng',
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          dot: 'bg-blue-600',
        };
      case 'STAFF':
        return {
          label: 'Nhân viên bán hàng',
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
          dot: 'bg-amber-600',
        };
    }
  };

  const permissionItems = [
    { key: 'canImportData', label: 'Nhập dữ liệu Excel từ KiotViet/ERP (Chỉ Admin)', icon: Upload },
    { key: 'canSellPOS', label: 'Bán hàng & Thu ngân POS', icon: ShoppingCart },
    { key: 'canViewInvoices', label: 'Quản lý & In hóa đơn', icon: Receipt },
    { key: 'canViewReports', label: 'Xem Báo cáo Doanh thu & Lợi nhuận', icon: BarChart3 },
    { key: 'canManageProducts', label: 'Quản lý Hàng hóa & Cập nhật giá', icon: Package },
    { key: 'canStockIn', label: 'Nhập kho & Cập nhật giá vốn', icon: Warehouse },
    { key: 'canManageSuppliers', label: 'Quản lý Nhà cung cấp & Công nợ', icon: Building2 },
    { key: 'canAuditInventory', label: 'Lập phiếu & Thực hiện Kiểm kê kho', icon: Warehouse },
    { key: 'canBalanceAudit', label: 'Duyệt cân bằng tồn kho kiểm kê', icon: ShieldCheck },
    { key: 'canManageCashbook', label: 'Quản lý Sổ quỹ (Thu / Chi)', icon: ReceiptText },
    { key: 'canAccessDataCenter', label: 'Trung tâm dữ liệu & Sao lưu', icon: Database },
    { key: 'canDeleteInvoices', label: 'Xóa / Hủy hóa đơn đã bán', icon: Lock },
    { key: 'canManageUsers', label: 'Quản trị nhân sự & Toàn quyền', icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Phân quyền & Chuyển đổi tài khoản</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Cửa hàng Ngân Sơn • 318 Vũ Quang • Đang đăng nhập: <strong className="text-white font-bold">{currentUser.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Left Column: User List */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách nhân sự ({users.length})
              </span>
              <span className="text-[11px] text-slate-400">Chọn để kích hoạt</span>
            </div>

            <div className="space-y-2.5">
              {users.map((user) => {
                const isActive = currentUser.id === user.id;
                const isSelected = selectedUserForDetail.id === user.id;
                const badge = getRoleBadge(user.role);

                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserForDetail(user)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10'
                        : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-xs"
                        />
                        {isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{user.name}</h4>
                          {isActive && (
                            <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">
                              Đang dùng
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          {user.email} • {user.phone}
                        </div>
                      </div>
                    </div>

                    {!isActive && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectUser(user);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[11px] font-bold transition-all flex items-center gap-1"
                        >
                          <span>Chuyển sang tài khoản này</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: User Details & Permissions Matrix */}
          <div className="md:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedUserForDetail.avatar}
                  alt={selectedUserForDetail.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-100 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">{selectedUserForDetail.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        getRoleBadge(selectedUserForDetail.role).bg
                      }`}
                    >
                      {getRoleBadge(selectedUserForDetail.role).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedUserForDetail.bio}</p>
                </div>
              </div>

              {currentUser.id !== selectedUserForDetail.id ? (
                <button
                  onClick={() => handleSelectUser(selectedUserForDetail)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Kích hoạt</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Đang sử dụng</span>
                </span>
              )}
            </div>

            {/* Permissions Matrix */}
            <div className="mt-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Chi tiết thẩm quyền & Phân quyền chức năng
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {Object.values(selectedUserForDetail.permissions).filter(Boolean).length}/12 Quyền
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {permissionItems.map((perm) => {
                  const hasPerm = selectedUserForDetail.permissions[perm.key as keyof typeof selectedUserForDetail.permissions];
                  const Icon = perm.icon;

                  return (
                    <div
                      key={perm.key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        hasPerm
                          ? 'bg-emerald-50/50 border-emerald-200/80 text-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Icon className={`w-4 h-4 shrink-0 ${hasPerm ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className={`truncate font-medium ${hasPerm ? 'font-semibold text-slate-900' : 'line-through text-slate-400'}`}>
                          {perm.label}
                        </span>
                      </div>

                      {hasPerm ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded shrink-0">
                          <Unlock className="w-3 h-3" />
                          <span>Cho phép</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>Khóa</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="text-slate-500">
            📌 <strong>Quy chuẩn:</strong> Admin: <strong className="text-slate-800">Phan Anh Tài</strong> • Quản lý: <strong className="text-slate-800">Nguyễn Thị Ngân, Phan Minh Sơn</strong> (Báo cáo, kiểm kê, kho) • Bán hàng: <strong className="text-slate-800">Phan Minh Nhật</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all text-xs cursor-pointer"
          >
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  );
};
