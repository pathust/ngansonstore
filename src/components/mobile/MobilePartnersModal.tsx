import React, { useState } from 'react';
import {
  X,
  CircleDollarSign,
  Truck,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building2,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface MobilePartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'LOAN' | 'DELIVERY' | 'TAX';
}

export const MobilePartnersModal: React.FC<MobilePartnersModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'LOAN',
}) => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'LOAN' | 'DELIVERY' | 'TAX'>(initialTab);

  // Loan calculator state
  const [loanAmount, setLoanAmount] = useState(100000000); // 100M
  const [loanMonths, setLoanMonths] = useState(12);

  // Monthly installment estimation (interest approx 1.1%/month)
  const monthlyPrincipal = Math.round(loanAmount / loanMonths);
  const monthlyInterest = Math.round(loanAmount * 0.011);
  const totalMonthly = monthlyPrincipal + monthlyInterest;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-extrabold text-base text-slate-900">
            {activeTab === 'LOAN'
              ? 'Vay vốn kinh doanh KiotViet'
              : activeTab === 'DELIVERY'
              ? 'Đối tác Giao hàng & Vận đơn'
              : 'Thuế & Kế toán / HĐĐT'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 px-4 pt-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('LOAN')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center flex items-center justify-center gap-1 ${
              activeTab === 'LOAN'
                ? 'border-[#0066FF] text-[#0066FF] bg-white rounded-t-xl'
                : 'border-transparent text-slate-500'
            }`}
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            <span>Vay vốn</span>
          </button>
          <button
            onClick={() => setActiveTab('DELIVERY')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center flex items-center justify-center gap-1 ${
              activeTab === 'DELIVERY'
                ? 'border-[#0066FF] text-[#0066FF] bg-white rounded-t-xl'
                : 'border-transparent text-slate-500'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Giao hàng</span>
          </button>
          <button
            onClick={() => setActiveTab('TAX')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center flex items-center justify-center gap-1 ${
              activeTab === 'TAX'
                ? 'border-[#0066FF] text-[#0066FF] bg-white rounded-t-xl'
                : 'border-transparent text-slate-500'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Thuế & KT</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {activeTab === 'LOAN' && (
            <>
              {/* Banner */}
              <div className="bg-gradient-to-tr from-[#0055EE] to-[#00A3FF] text-white p-4 rounded-2xl shadow-sm flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                  KiotViet Financial Partner
                </span>
                <span className="text-lg font-black leading-tight">Vốn nhanh kinh doanh, lãi suất từ 0.99%/tháng</span>
                <span className="text-xs text-blue-100 mt-1">
                  Hạn mức duyệt đến 500 triệu không cần tài sản thế chấp. Dựa trên doanh thu bán hàng thực tế.
                </span>
              </div>

              {/* Loan Calculator */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                  <Calculator className="w-4 h-4 text-[#0066FF]" />
                  <span>Ước tính số tiền cần vay</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Số tiền:</span>
                    <span className="font-bold text-[#0066FF]">{formatCurrency(loanAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min={20000000}
                    max={500000000}
                    step={10000000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full accent-[#0066FF]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>20 triệu</span>
                    <span>500 triệu</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1">Thời gian vay:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[6, 12, 24].map((m) => (
                      <button
                        key={m}
                        onClick={() => setLoanMonths(m)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          loanMonths === m
                            ? 'bg-[#EAF2FF] border-[#0066FF] text-[#0066FF]'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        {m} tháng
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimate Result */}
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                  <span className="text-xs text-slate-600 font-medium">Trả góp ước tính / tháng:</span>
                  <span className="text-sm font-black text-emerald-600">
                    {formatCurrency(totalMonthly)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    showToast('Đã gửi thông tin đăng ký vay vốn! Nhân viên tín dụng sẽ liên hệ sau 15 phút.', 'success');
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl bg-[#0066FF] text-white font-bold text-xs shadow-md active:scale-98 transition-all"
                >
                  Đăng ký tư vấn miễn phí
                </button>
              </div>

              {/* Partners */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700">Ngân hàng đối tác liên kết</span>
                {['VPBank SME', 'KBank Biz Loan', 'Easy Credit / EVN Finance'].map((bank, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-slate-800">{bank}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-bold">Duyệt tự động 24h</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'DELIVERY' && (
            <>
              <div className="bg-gradient-to-tr from-cyan-600 to-blue-600 text-white p-4 rounded-2xl shadow-sm flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-100">
                  Giao hàng toàn quốc
                </span>
                <span className="text-lg font-black leading-tight">Kết nối tự động hãng vận chuyển</span>
                <span className="text-xs text-cyan-100 mt-0.5">
                  Đẩy đơn 1 chạm, bưu tá đến lấy hàng tại cửa hàng Ngân Sơn 318 Vũ Quang.
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { name: 'Ahamove', desc: 'Giao siêu tốc nội thành TP. Hà Tĩnh (30-60 phút)', status: 'Đang hoạt động', color: 'text-amber-600' },
                  { name: 'Viettel Post', desc: 'Mạng lưới toàn quốc, chiết khấu 15% cho chủ shop KiotViet', status: 'Đã liên kết', color: 'text-red-600' },
                  { name: 'Giao Hàng Tiết Kiệm (GHTK)', desc: 'Tối ưu tuyến huyện & liên tỉnh', status: 'Đã liên kết', color: 'text-emerald-600' },
                  { name: 'VNPost', desc: 'Bưu điện Việt Nam phủ sóng đến xã vùng xa', status: 'Sẵn sàng kết nối', color: 'text-blue-600' },
                ].map((p, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 flex-1 pr-2">
                      <span className="font-bold text-sm text-slate-900">{p.name}</span>
                      <span className="text-xs text-slate-500">{p.desc}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 bg-slate-50 rounded-lg ${p.color}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  showToast('Đã mở kết nối vận đơn KiotViet Shipping!', 'info');
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-[#0066FF] text-white font-bold text-xs shadow-md active:scale-98 transition-all"
              >
                Tạo vận đơn giao hàng mới
              </button>
            </>
          )}

          {activeTab === 'TAX' && (
            <>
              <div className="bg-gradient-to-tr from-sky-600 to-indigo-700 text-white p-4 rounded-2xl shadow-sm flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-100">
                  Kê khai thuế & HĐĐT
                </span>
                <span className="text-lg font-black leading-tight">Phát hành Hóa Đơn Điện Tử từ Máy tính tiền</span>
                <span className="text-xs text-sky-100 mt-0.5">
                  Đáp ứng 100% Thông tư 78 & Nghị định 123 của Tổng cục Thuế.
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex flex-col gap-3">
                <h4 className="font-extrabold text-xs text-slate-900">Nhà cung cấp HĐĐT đang liên kết</h4>
                {[
                  { name: 'VNPT-Invoice', code: 'VNPT', status: 'Đang kết nối', active: true },
                  { name: 'Viettel S-Invoice', code: 'VIETTEL', status: 'Sẵn sàng', active: false },
                  { name: 'M-Invoice', code: 'MINVOICE', status: 'Sẵn sàng', active: false },
                ].map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{s.name}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-md ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}

                <button
                  onClick={() => {
                    showToast('Đã xuất bảng kê hóa đơn bán hàng tháng hiện tại!', 'success');
                    onClose();
                  }}
                  className="mt-2 w-full py-3 rounded-xl bg-[#0066FF] text-white font-bold text-xs shadow-md active:scale-98 transition-all"
                >
                  Xuất bảng kê hóa đơn thuế (.xlsx)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
