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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: 'OWNER' | 'CASHIER' | 'INVENTORY';
  isActive: boolean;
}

interface MobileStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileStaffModal: React.FC<MobileStaffModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { users, showToast } = useApp();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'OWNER' | 'CASHIER' | 'INVENTORY'>('CASHIER');

  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('nganson_staff');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone || 'Chưa có SĐT',
      role: (u.role === 'ADMIN' ? 'OWNER' : u.role === 'CASHIER' ? 'CASHIER' : 'INVENTORY') as 'OWNER' | 'CASHIER' | 'INVENTORY',
      isActive: true,
    }));
  });

  if (!isOpen) return null;

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Vui lòng nhập tên nhân viên!', 'warning');
      return;
    }

    const newStaff: StaffMember = {
      id: `st-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim() || 'Chưa có SĐT',
      role: newRole,
      isActive: true,
    };

    const updated = [...staffList, newStaff];
    setStaffList(updated);
    localStorage.setItem('nganson_staff', JSON.stringify(updated));
    showToast(`Đã thêm nhân viên "${newStaff.name}" thành công!`, 'success');
    setIsAdding(false);
    setNewName('');
    setNewPhone('');
  };

  const getRoleBadge = (role: StaffMember['role']) => {
    switch (role) {
      case 'OWNER':
        return { label: 'Quản trị viên', bg: 'bg-purple-100 text-purple-700' };
      case 'CASHIER':
        return { label: 'Thu ngân / Bán hàng', bg: 'bg-blue-100 text-[#0066FF]' };
      case 'INVENTORY':
        return { label: 'Thủ kho & Nhập hàng', bg: 'bg-teal-100 text-teal-700' };
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
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {isAdding ? 'Thêm nhân viên mới' : 'Nhân viên & Phân quyền'}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {isAdding ? 'Tạo tài khoản và phân quyền' : `${staffList.length} nhân sự`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isAdding ? (
            <form onSubmit={handleAddStaff} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tên nhân viên</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Lê Thị Hằng"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#0066FF]"
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Vai trò & Phân quyền</label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'CASHIER', title: 'Thu ngân / Bán lẻ', desc: 'Bán hàng POS, xem hoá đơn, lập phiếu thu chi' },
                    { id: 'INVENTORY', title: 'Thủ kho', desc: 'Kiểm kho, nhập hàng, quản lý sản phẩm' },
                    { id: 'OWNER', title: 'Quản lý chi nhánh', desc: 'Toàn quyền truy cập báo cáo, doanh thu và cài đặt' },
                  ].map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setNewRole(r.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-0.5 transition-colors ${
                        newRole === r.id
                          ? 'bg-blue-50/50 border-[#0066FF]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{r.title}</span>
                      <span className="text-[11px] text-slate-500">{r.desc}</span>
                    </div>
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
            <div className="flex flex-col gap-3">
              {staffList.map((st) => {
                const badge = getRoleBadge(st.role);
                return (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                        {st.name.slice(0, 1)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-900">{st.name}</span>
                        <span className="text-xs text-slate-400 font-medium">{st.phone}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md mt-1 self-start ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setStaffList((prev) =>
                          prev.map((item) =>
                            item.id === st.id ? { ...item, isActive: !item.isActive } : item
                          )
                        );
                        showToast(
                          `Đã ${st.isActive ? 'tạm khóa' : 'kích hoạt lại'} tài khoản ${st.name}`,
                          'info'
                        );
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold ${
                        st.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {st.isActive ? 'Đang làm' : 'Đã khóa'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isAdding && (
          <div className="p-4 border-t border-slate-100 bg-white">
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
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
