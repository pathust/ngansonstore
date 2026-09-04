import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Store,
  CreditCard,
  Printer,
  Check,
  QrCode,
  Building2,
  Phone,
  MapPin,
  FileText,
  RefreshCw,
  Copy,
  Download,
  ExternalLink,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Wifi,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VIETNAMESE_BANKS } from '../../data/bankList';
import { StoreSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useVietQr } from '../../hooks/useVietQr';
import { QrStandeeModal } from '../settings/QrStandeeModal';

interface MobileStoreSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileStoreSettingsModal: React.FC<MobileStoreSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { storeSettings, updateStoreSettings, showToast } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });

  // Bank search & Standee modal
  const [bankSearch, setBankSearch] = useState('');
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);

  // Live QR Test Simulator
  const [testAmount, setTestAmount] = useState<number>(0);
  const [testOrderCode, setTestOrderCode] = useState<string>('');

  const previewDesc = formData.transferSyntaxPrefix
    ? formData.transferSyntaxPrefix.replace('{order_code}', testOrderCode)
    : `${testOrderCode}`;

  const {
    qrUrl,
    isGenerating: isQrLoading,
    isOnlineTemplate,
    localDataUrl,
    onlineUrl,
    regenerate,
    downloadQr,
    copyQrLink,
  } = useVietQr({
    bankId: formData.bankId || 'MB',
    accountNumber: formData.accountNumber || '',
    accountHolder: formData.accountHolder || '',
    template: formData.qrTemplate || 'compact2',
    amount: testAmount,
    memo: previewDesc,
    useCustomQr: formData.useCustomQr,
    customQrImage: formData.customQrImage,
  });

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ ...storeSettings });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      showToast('Vui lòng nhập tên cửa hàng!', 'error');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      updateStoreSettings(formData);
      showToast('Đã lưu cấu hình cửa hàng & mã QR thành công!', 'success');
      onClose();
    } catch (error) {
      showToast('Có lỗi xảy ra, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Ảnh quá lớn (tối đa 2MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          customQrImage: base64,
          useCustomQr: true,
        }));
        showToast('Đã tải ảnh mã QR lên thành công!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };


  const filteredBanks = VIETNAMESE_BANKS.filter(
    (b) =>
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
      b.code.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const selectedBankObj = VIETNAMESE_BANKS.find((b) => b.code === formData.bankId);

  const handleRegenerateQr = async () => {
    if (!formData.accountNumber?.trim()) {
      showToast('Vui lòng nhập Số tài khoản ngân hàng trước khi tạo mã QR!', 'error');
      return;
    }
    if (!formData.accountHolder?.trim()) {
      showToast('Vui lòng nhập Tên chủ tài khoản trước khi tạo mã QR!', 'error');
      return;
    }

    const success = await regenerate();
    if (success) {
      showToast('Đã kích hoạt tạo lại mã QR thành công!', 'success');
    }
  };

  const handleDownloadQr = async () => {
    await downloadQr();
    showToast('Đã tải ảnh mã QR xuống thiết bị!', 'success');
  };

  const handleCopyQrLink = async () => {
    const success = await copyQrLink();
    if (success) {
      showToast('Đã sao chép liên kết mã VietQR!', 'success');
    } else {
      showToast('Không thể sao chép liên kết!', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-[#F5F6F8] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="h-14 bg-[#0066FF] text-white flex items-center justify-between px-3 shrink-0 shadow-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-1 font-semibold text-sm active:opacity-80 py-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Cài đặt cửa hàng & VietQR</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsStandeeModalOpen(true)}
            className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all"
            title="In Standee để bàn"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Standee</span>
          </button>

          <button
            disabled={isSubmitting}
            onClick={handleSave}
            className="flex items-center gap-1 bg-white text-[#0066FF] px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs active:scale-95 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isSubmitting ? 'Đang xử lý...' : 'Lưu'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-24">
        {/* Card 1: Thông tin cửa hàng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#0066FF]" />
            <span>Thông tin cửa hàng</span>
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên cửa hàng (In trên hóa đơn) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tên viết tắt</label>
              <input
                type="text"
                value={formData.shortName || ''}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Địa chỉ cửa hàng</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mã số thuế (MST)</label>
              <input
                type="text"
                value={formData.taxCode || ''}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Khẩu hiệu / Ngành hàng</label>
              <input
                type="text"
                value={formData.slogan || ''}
                onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                placeholder="Điện nước, kim khí..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tên Wifi cửa hàng</label>
              <input
                type="text"
                value={formData.wifiSsid || ''}
                onChange={(e) => setFormData({ ...formData, wifiSsid: e.target.value })}
                placeholder="NganSon_Guest"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu Wifi</label>
              <input
                type="text"
                value={formData.wifiPassword || ''}
                onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                placeholder="nganson318vuquang"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Lời chào cuối hoá đơn</label>
            <input
              type="text"
              value={formData.receiptFooterNote}
              onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800"
            />
          </div>
        </div>

        {/* Card 2: Tài khoản nhận tiền VietQR */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Tài khoản ngân hàng VietQR</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
              Napas247 Dynamic
            </span>
          </div>

          {/* Chọn ngân hàng kèm tìm kiếm */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-[#0066FF] font-bold">
                {formData.bankName || formData.bankId}
              </span>
            </div>

            {/* Ô tìm kiếm nhanh ngân hàng */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Tìm nhanh mã ngân hàng (MB, VCB, TCB, BIDV...)"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
              />
            </div>

            <select
              value={formData.bankId}
              onChange={(e) => {
                const bank = VIETNAMESE_BANKS.find((b) => b.code === e.target.value);
                setFormData({
                  ...formData,
                  bankId: e.target.value,
                  bankName: bank ? `${bank.shortName} (${bank.name})` : e.target.value,
                });
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800 font-bold"
            >
              {filteredBanks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.shortName} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Số tài khoản (STK) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\s+/g, '') })}
                placeholder="VD: 0912345678"
                className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tên chủ tài khoản <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.accountHolder}
                onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value.toUpperCase() })}
                placeholder="VD: PHAN ANH TAI"
                className="w-full px-3 py-2 text-sm font-bold uppercase text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Cú pháp nội dung chuyển khoản
            </label>
            <input
              type="text"
              value={formData.transferSyntaxPrefix || ''}
              onChange={(e) => setFormData({ ...formData, transferSyntaxPrefix: e.target.value })}
              placeholder="VD: NGANSON {order_code}"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066FF] text-slate-800 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Gợi ý: Dùng <code className="text-[#0066FF] font-bold">{'{order_code}'}</code> để tự động ghép mã đơn hàng
            </span>
          </div>

          {/* QR Template Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Kiểu mẫu hiển thị VietQR
            </label>
            <div className="flex items-center gap-2">
              {[
                { id: 'compact2', label: 'Gọn đẹp (compact2)' },
                { id: 'compact', label: 'Tiêu chuẩn (compact)' },
                { id: 'qr_only', label: 'Chỉ mã QR' },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, qrTemplate: tmpl.id as any })}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all ${
                    formData.qrTemplate === tmpl.id
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tùy chọn ảnh QR tĩnh riêng */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Dùng ảnh mã QR tĩnh riêng</span>
                <span className="text-[10px] text-slate-500">Nếu bạn có ảnh mã QR riêng từ ngân hàng/MoMo</span>
              </div>
              <input
                type="checkbox"
                checked={formData.useCustomQr}
                onChange={(e) => setFormData({ ...formData, useCustomQr: e.target.checked })}
                className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
              />
            </div>

            {formData.useCustomQr && (
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span>Tải ảnh QR lên</span>
                  <input type="file" accept="image/*" onChange={handleCustomQrUpload} className="hidden" />
                </label>
                {formData.customQrImage && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã tải lên
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Simulator: Nhập tiền & Mã đơn thử nghiệm */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Thử nghiệm tạo mã QR theo số tiền:</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Số tiền thử:</label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0 đ"
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-[#0066FF] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nội dung thử:</label>
                <input
                  type="text"
                  value={testOrderCode}
                  onChange={(e) => setTestOrderCode(e.target.value)}
                  placeholder="VD: DH123"
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* NÚT QUAN TRỌNG: KÍCH HOẠT TẠO LẠI MÃ QR */}
          <button
            type="button"
            onClick={handleRegenerateQr}
            disabled={isQrLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0066FF] via-indigo-600 to-[#0066FF] text-white text-xs font-black shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isQrLoading ? 'animate-spin' : ''}`} />
            <span>{isQrLoading ? 'Đang kích hoạt tạo QR...' : 'Kích Hoạt Tạo Lại Mã QR'}</span>
          </button>

          {/* KHUNG XEM TRƯỚC MÃ QR VỚI TRẠNG THÁI LOADING VÀ OFFLINE FALLBACK */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/80 flex flex-col items-center justify-center gap-2.5 relative">
            <div className="flex items-center justify-between w-full pb-1 border-b border-slate-200/60">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                Mã QR Thanh Toán
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isOnlineTemplate
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-[#0066FF] border-blue-200'
              }`}>
                {formData.useCustomQr
                  ? 'Ảnh QR Tùy Chọn'
                  : isOnlineTemplate
                  ? 'VietQR Napas247'
                  : 'EMVCo Tiêu Chuẩn'}
              </span>
            </div>

            <div className="relative p-2 bg-white rounded-xl shadow-xs border border-slate-200 min-h-[200px] min-w-[200px] flex items-center justify-center">
              {isQrLoading && !qrUrl && (
                <div className="absolute inset-0 bg-white/85 backdrop-blur-2xs rounded-xl flex flex-col items-center justify-center gap-2 z-10">
                  <RefreshCw className="w-8 h-8 text-[#0066FF] animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Đang kích hoạt tạo QR...</span>
                </div>
              )}

              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="VietQR Preview"
                  className="w-48 max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-center py-6 px-3 text-slate-400 text-xs">
                  <QrCode className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  Vui lòng nhập Số tài khoản và chọn Ngân hàng để hiển thị mã QR
                </div>
              )}
            </div>

            {!isOnlineTemplate && !formData.useCustomQr && qrUrl && (
              <div className="w-full inline-flex items-center gap-1.5 p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[10px] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Mã VietQR chuẩn EMVCo ngoại tuyến (quét được trên 100% app ngân hàng)</span>
              </div>
            )}

            <div className="text-center">
              <div className="text-xs font-mono font-bold text-slate-800">
                {selectedBankObj ? `${selectedBankObj.shortName} (${selectedBankObj.name})` : formData.bankId} • {formData.accountNumber || 'Chưa có STK'}
              </div>
              <div className="text-xs font-black text-[#0066FF] uppercase">
                {formData.accountHolder || 'CHƯA CÓ TÊN CHỦ TK'}
              </div>
              {(testAmount > 0 || previewDesc) && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {testAmount > 0 && (
                    <span>
                      Số tiền: <strong className="text-slate-900">{formatCurrency(testAmount)}</strong>
                    </span>
                  )}
                  {testAmount > 0 && previewDesc && <span> • </span>}
                  {previewDesc && (
                    <span>
                      Nội dung: <strong className="text-slate-900">{previewDesc}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Các nút thao tác nhanh: Sao chép link, Tải ảnh, In standee */}
            <div className="grid grid-cols-3 gap-2 w-full pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={handleCopyQrLink}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <Copy className="w-3 h-3 text-slate-500" />
                <span>Sao chép</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <Download className="w-3 h-3 text-emerald-600" />
                <span>Tải ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStandeeModalOpen(true)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-[#0066FF] active:scale-95 transition-all shadow-2xs cursor-pointer"
              >
                <Printer className="w-3 h-3 text-[#0066FF]" />
                <span>Standee</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Tuỳ chọn in ấn & Bán hàng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col gap-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Tuỳ chọn in bill K80 & Bán hàng</span>
          </h3>

          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-slate-800">In mã VietQR lên hoá đơn K80</span>
            <input
              type="checkbox"
              checked={formData.showQrOnK80Receipt}
              onChange={(e) => setFormData({ ...formData, showQrOnK80Receipt: e.target.checked })}
              className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800">In mã VietQR trên Hóa đơn A4 / PDF</span>
            <input
              type="checkbox"
              checked={formData.showQrOnA4Invoice}
              onChange={(e) => setFormData({ ...formData, showQrOnA4Invoice: e.target.checked })}
              className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800">In thông tin Wifi trên hoá đơn</span>
            <input
              type="checkbox"
              checked={formData.showWifiOnReceipt}
              onChange={(e) => setFormData({ ...formData, showWifiOnReceipt: e.target.checked })}
              className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800">In mã số thuế trên hoá đơn</span>
            <input
              type="checkbox"
              checked={formData.showTaxCodeOnReceipt}
              onChange={(e) => setFormData({ ...formData, showTaxCodeOnReceipt: e.target.checked })}
              className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800">In khẩu hiệu / slogan trên hoá đơn</span>
            <input
              type="checkbox"
              checked={formData.showSloganOnReceipt}
              onChange={(e) => setFormData({ ...formData, showSloganOnReceipt: e.target.checked })}
              className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800">Tự động mở két tiền sau in</span>
            <input
              type="checkbox"
              checked={formData.autoOpenCashDrawer}
              onChange={(e) => setFormData({ ...formData, autoOpenCashDrawer: e.target.checked })}
              className="w-5 h-5 accent-[#0066FF] rounded cursor-pointer"
            />
          </div>
        </div>
      </form>

      {/* Standee Modal for Mobile */}
      <QrStandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        settings={formData}
      />
    </div>
  );
};
