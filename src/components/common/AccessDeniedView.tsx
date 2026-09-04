import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowRight, Lock, KeyRound } from 'lucide-react';

interface AccessDeniedViewProps {
  moduleName: string;
  requiredRole?: string;
  onOpenSwitcher?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  moduleName,
  requiredRole = 'Quản lý cửa hàng hoặc Admin',
  onOpenSwitcher,
}) => {
  const { currentUser, setIsUserSwitcherOpen } = useApp();

  const handleSwitch = () => {
    if (onOpenSwitcher) {
      onOpenSwitcher();
    } else {
      setIsUserSwitcherOpen(true);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-black text-slate-900 mb-1">Quyền truy cập bị giới hạn</h2>
        <p className="text-xs text-slate-500 mb-4">
          Chức năng <strong className="text-slate-800 font-bold font-mono px-1.5 py-0.5 bg-slate-100 rounded">"{moduleName}"</strong> yêu cầu quyền truy cập từ <strong className="text-blue-700">{requiredRole}</strong>.
        </p>

        {/* Current User Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5 flex items-center gap-3 text-left">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover border border-slate-300 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3 shrink-0" />
              <span>{currentUser.roleTitle}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSwitch}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Chuyển sang tài khoản Quản lý / Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-slate-400 mt-2">
            Liên hệ <strong>Phan Anh Tài (Admin)</strong> hoặc Quản lý (<strong>Nguyễn Thị Ngân</strong>, <strong>Phan Minh Sơn</strong>) để được cấp quyền.
          </p>
        </div>
      </div>
    </div>
  );
};
