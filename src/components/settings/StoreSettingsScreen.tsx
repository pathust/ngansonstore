import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StoreSettings } from '../../types';
import { VIETNAMESE_BANKS } from '../../data/bankList';
import { formatCurrency } from '../../utils/formatters';
import { useVietQr } from '../../hooks/useVietQr';
import { QrStandeeModal } from './QrStandeeModal';
import {
  Building2,
  QrCode,
  Printer,
  Save,
  RotateCcw,
  Wifi,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Eye,
  Store,
  Upload,
  RefreshCw,
  Download,
  AlertCircle,
} from 'lucide-react';

export const StoreSettingsScreen: React.FC = () => {
  const { storeSettings, updateStoreSettings, resetStoreSettings, showToast, currentBranch } = useApp();

  // Local form state
  const [formData, setFormData] = useState<StoreSettings>(storeSettings);
  const [activeTab, setActiveTab] = useState<'STORE_INFO' | 'VIETQR' | 'PRINT_SETTINGS'>('STORE_INFO');
  const [bankSearch, setBankSearch] = useState('');
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);

  // Live QR Test Amount & Memo
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

  // Sync formData when storeSettings changes externally
  React.useEffect(() => {
    setFormData(storeSettings);
  }, [storeSettings]);

  const handleInputChange = <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBankSelect = (bankCode: string) => {
    const selectedBank = VIETNAMESE_BANKS.find((b) => b.code === bankCode);
    setFormData((prev) => ({
      ...prev,
      bankId: bankCode,
      bankName: selectedBank ? selectedBank.name : bankCode,
    }));
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

  const handleSave = () => {
    updateStoreSettings(formData);
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ thông tin cửa hàng và mã QR về mặc định ban đầu?')) {
      resetStoreSettings();
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
      showToast('Đã kích hoạt tạo lại mã VietQR thành công!', 'success');
    }
  };

  const handleDownloadQr = async () => {
    await downloadQr();
    showToast('Đã tải ảnh mã QR xuống máy thành công!', 'success');
  };

  const handleCopyQrLink = async () => {
    const success = await copyQrLink();
    if (success) {
      showToast('Đã sao chép liên kết mã VietQR vào bộ nhớ tạm!', 'success');
    } else {
      showToast('Không thể sao chép liên kết!', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden bg-slate-100 rounded-lg border border-slate-200 shadow-2xs">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
            <img src="/logo.png" alt="Logo Cửa Hàng Ngân Sơn" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Cài Đặt Cửa Hàng & Mã QR Thanh Toán
              </h1>
              <span className="badge-blue text-[10px] font-bold">318 Vũ Quang</span>
            </div>
            <p className="text-xs text-slate-500">
              Tùy chỉnh thông tin in hóa đơn, tài khoản ngân hàng, mã VietQR tự động và mẫu standee để bàn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStandeeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Standee QR Để Bàn</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Khôi phục cài đặt mặc định ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khôi phục</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Lưu Cài Đặt</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-white border-b border-slate-200 px-5 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('STORE_INFO')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'STORE_INFO'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Thông Tin Cửa Hàng</span>
        </button>

        <button
          onClick={() => setActiveTab('VIETQR')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'VIETQR'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-600" />
          <span>Mã QR & Ngân Hàng VietQR</span>
        </button>

        <button
          onClick={() => setActiveTab('PRINT_SETTINGS')}
          className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'PRINT_SETTINGS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer className="w-4 h-4 text-indigo-600" />
          <span>Tùy Chọn In Hóa Đơn (K80 / A4)</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Configuration */}
          <div className="lg:col-span-7 space-y-6">
            {/* TAB 1: STORE INFO */}
            {activeTab === 'STORE_INFO' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-900">Hồ Sơ Cửa Hàng & Doanh Nghiệp</h2>
                  </div>
                  <span className="text-[11px] text-slate-400">Hiển thị trên hóa đơn, phiếu kho và báo cáo</span>
                </div>

                {/* Store Logo Identity Banner */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden">
                    <img src="/logo.png" alt="Logo Cửa hàng Ngân Sơn" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Logo Nhận Diện Thương Hiệu</span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Chính thức</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Biểu tượng NS màu đỏ chính thức của Cửa Hàng Ngân Sơn (318 Vũ Quang), được áp dụng đồng bộ trên giao diện web, POS, mobile và hóa đơn in.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Cửa Hàng (In trên biển hiệu & đầu hóa đơn) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="VD: CỬA HÀNG ĐIỆN NƯỚC & KIM KHÍ NGÂN SƠN"
                      className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Thương Hiệu Viết Tắt
                    </label>
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => handleInputChange('shortName', e.target.value)}
                      placeholder="VD: Cửa hàng Ngân Sơn"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã Số Thuế (MST / Hộ kinh doanh)
                    </label>
                    <input
                      type="text"
                      value={formData.taxCode || ''}
                      onChange={(e) => handleInputChange('taxCode', e.target.value)}
                      placeholder="VD: 2801234567"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Khẩu Hiệu / Ngành Hàng Kinh Doanh
                    </label>
                    <input
                      type="text"
                      value={formData.slogan || ''}
                      onChange={(e) => handleInputChange('slogan', e.target.value)}
                      placeholder="VD: Chuyên thiết bị điện nước, kim khí, phụ kiện xây dựng dân dụng"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hotline Bán Hàng / Điện Thoại Chính <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="VD: 0912.345.678"
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Điện Thoại Phụ / Zalo Tư Vấn
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.secondaryPhone || ''}
                        onChange={(e) => handleInputChange('secondaryPhone', e.target.value)}
                        placeholder="VD: 0987.654.321"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Địa Chỉ Cửa Hàng <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="VD: 318 Vũ Quang, TP. Hà Tĩnh"
                        className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Wifi Quầy Thu Ngân
                    </label>
                    <div className="relative">
                      <Wifi className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.wifiSsid || ''}
                        onChange={(e) => handleInputChange('wifiSsid', e.target.value)}
                        placeholder="VD: NganSon_Guest"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật Khẩu Wifi
                    </label>
                    <input
                      type="text"
                      value={formData.wifiPassword || ''}
                      onChange={(e) => handleInputChange('wifiPassword', e.target.value)}
                      placeholder="VD: nganson318vuquang"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lời Cảm Ơn & Chính Sách Đổi Trả / Bảo Hành (In chân hóa đơn)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.receiptFooterNote}
                      onChange={(e) => handleInputChange('receiptFooterNote', e.target.value)}
                      placeholder="VD: Cảm ơn Quý khách & Hẹn gặp lại! Quý khách được đổi trả hàng trong 3 ngày kèm hóa đơn này."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VIETQR & BANKING */}
            {activeTab === 'VIETQR' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-slate-900">Cấu Hình Mã QR & Tài Khoản Ngân Hàng</h2>
                  </div>
                  <span className="badge-green text-[10px] font-bold">VietQR Napas247 Dynamic</span>
                </div>

                {/* Bank Selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">
                      Ngân Hàng Thụ Hưởng <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      Đang chọn: {selectedBankObj?.name || formData.bankId}
                    </span>
                  </div>

                  {/* Bank Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Tìm nhanh tên ngân hàng (MB, VCB, Techcombank, Vietin, Agribank...)"
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  {/* Grid of Bank Options */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
                    {filteredBanks.map((bank) => {
                      const isSelected = formData.bankId === bank.code;
                      return (
                        <button
                          key={bank.code}
                          type="button"
                          onClick={() => handleBankSelect(bank.code)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-600 shrink-0 border border-slate-200">
                            {bank.code}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{bank.shortName}</div>
                            <div className="text-[9px] text-slate-500 truncate">{bank.code}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số Tài Khoản Ngân Hàng (STK) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\s+/g, ''))}
                      placeholder="VD: 0912345678"
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên Chủ Tài Khoản (Người thụ hưởng) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.accountHolder}
                      onChange={(e) => handleInputChange('accountHolder', e.target.value.toUpperCase())}
                      placeholder="VD: PHAN ANH TAI"
                      className="w-full px-3 py-2 text-xs font-bold text-slate-900 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mẫu Hiển Thị VietQR (Template)
                    </label>
                    <select
                      value={formData.qrTemplate}
                      onChange={(e) => handleInputChange('qrTemplate', e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white cursor-pointer"
                    >
                      <option value="compact2">⭐ Chuẩn Khung Napas247 (Khuyên dùng - compact2)</option>
                      <option value="compact">Mẫu Nhỏ Gọn (compact)</option>
                      <option value="qr_only">Chỉ Mã QR Thuần (qr_only)</option>
                      <option value="print">Mẫu In Ấn Chuyên Dụng (print)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cú Pháp Nội Dung Chuyển Khoản Mặc Định
                    </label>
                    <input
                      type="text"
                      value={formData.transferSyntaxPrefix}
                      onChange={(e) => handleInputChange('transferSyntaxPrefix', e.target.value)}
                      placeholder="VD: NGANSON {order_code}"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Gợi ý: Dùng <code className="text-blue-600 font-bold">{'{order_code}'}</code> để tự động điền mã đơn
                    </div>
                  </div>
                </div>

                {/* Option: Upload Custom Static QR */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Tùy Chọn: Dùng Ảnh Mã QR Tĩnh Riêng</div>
                      <div className="text-[11px] text-slate-500">
                        Nếu bạn có ảnh mã QR riêng của MoMo, ZaloPay hoặc mã cố định muốn thay thế
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.useCustomQr}
                        onChange={(e) => handleInputChange('useCustomQr', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.useCustomQr && (
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tải ảnh mã QR lên (.png, .jpg)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomQrUpload}
                          className="hidden"
                        />
                      </label>
                      {formData.customQrImage && (
                        <div className="flex items-center gap-2">
                          <img
                            src={formData.customQrImage}
                            alt="Custom QR Preview"
                            className="w-10 h-10 object-cover rounded border border-slate-300"
                          />
                          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã tải lên
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PRINT SETTINGS */}
            {activeTab === 'PRINT_SETTINGS' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-sm font-bold text-slate-900">Tùy Chọn In Hóa Đơn & Quầy Thu Ngân</h2>
                  </div>
                  <span className="text-[11px] text-slate-400">Máy in nhiệt K80 (80mm) & Hóa đơn PDF A4</span>
                </div>

                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="font-bold text-slate-800">In mã VietQR trên Hóa đơn nhiệt K80</div>
                      <div className="text-[11px] text-slate-500">
                        In mã QR ở chân phiếu thanh toán K80 để khách quét tra cứu và thanh toán
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.showQrOnK80Receipt}
                      onChange={(e) => handleInputChange('showQrOnK80Receipt', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <div className="font-bold text-slate-800">In mã VietQR trên Hóa đơn PDF A4 / A5</div>
                      <div className="text-[11px] text-slate-500">
                        Hiển thị mã QR chuyên nghiệp kèm thông tin tài khoản trên file PDF xuất ra
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.showQrOnA4Invoice}
                      onChange={(e) => handleInputChange('showQrOnA4Invoice', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <div className="font-bold text-slate-800">In thông tin Wifi cửa hàng trên hóa đơn</div>
                      <div className="text-[11px] text-slate-500">
                        Hiển thị Tên wifi và Mật khẩu ở chân hóa đơn để tiện cho khách ghé mua
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.showWifiOnReceipt}
                      onChange={(e) => handleInputChange('showWifiOnReceipt', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <div className="font-bold text-slate-800">In Mã số thuế trên hóa đơn</div>
                      <div className="text-[11px] text-slate-500">
                        In MST / Mã hộ kinh doanh ở phần đầu thông tin cửa hàng
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.showTaxCodeOnReceipt}
                      onChange={(e) => handleInputChange('showTaxCodeOnReceipt', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <div className="font-bold text-slate-800">In Khẩu hiệu / Slogan ngành hàng</div>
                      <div className="text-[11px] text-slate-500">
                        In dòng mô tả lĩnh vực kinh doanh (Điện nước, kim khí...) dưới tên cửa hàng
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.showSloganOnReceipt}
                      onChange={(e) => handleInputChange('showSloganOnReceipt', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive QR & Receipt Preview */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live QR Testing Simulator Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Xem Thử Mã QR Trực Quan (Live Simulator)
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Thời Gian Thực
                </span>
              </div>

              {/* Simulator Inputs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Số Tiền Thử Nghiệm:
                  </label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2 py-1 text-xs font-bold text-blue-700 bg-white rounded border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Mã Đơn / Nội Dung Thử:
                  </label>
                  <input
                    type="text"
                    value={testOrderCode}
                    onChange={(e) => setTestOrderCode(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-white rounded border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Button: Kích Hoạt Tạo Lại Mã QR */}
              <button
                type="button"
                onClick={handleRegenerateQr}
                disabled={isQrLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-black shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isQrLoading ? 'animate-spin' : ''}`} />
                <span>{isQrLoading ? 'Đang tạo mã VietQR...' : 'Kích Hoạt Tạo Lại Mã QR'}</span>
              </button>

              {/* Rendered Live QR Code Frame */}
              <div className="bg-gradient-to-b from-slate-50 to-blue-50/40 p-4 rounded-xl border border-slate-200 flex flex-col items-center text-center shadow-inner relative">
                <div className="flex items-center justify-between w-full pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Mã QR Thanh Toán</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isOnlineTemplate
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {formData.useCustomQr
                      ? 'Ảnh QR Tĩnh Tùy Chọn'
                      : isOnlineTemplate
                      ? 'VietQR Napas247'
                      : 'EMVCo Tiêu Chuẩn'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md relative min-h-[200px] min-w-[200px] flex items-center justify-center">
                  {isQrLoading && !qrUrl && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs rounded-xl flex flex-col items-center justify-center gap-2 z-10">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                      <span className="text-[11px] font-bold text-slate-700">Đang tạo mã QR...</span>
                    </div>
                  )}

                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt="VietQR Live Test Preview"
                      className="w-48 h-48 object-contain mx-auto rounded"
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 text-xs">
                      <QrCode className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      Vui lòng nhập Số tài khoản và chọn Ngân hàng để tạo mã QR
                    </div>
                  )}
                </div>

                {!isOnlineTemplate && !formData.useCustomQr && qrUrl && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Mã VietQR chuẩn EMVCo ngoại tuyến (quét được trên 100% app ngân hàng)</span>
                  </div>
                )}

                <div className="mt-3 text-xs font-mono font-bold text-slate-800">
                  {formData.bankName || formData.bankId} • {formData.accountNumber || 'Chưa nhập STK'}
                </div>
                <div className="text-[11px] font-bold text-blue-700 uppercase">
                  {formData.accountHolder || 'CHƯA NHẬP CHỦ TÀI KHOẢN'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Số tiền: <strong className="text-slate-900">{formatCurrency(testAmount)}</strong> • Nội dung: <strong className="text-slate-900">{previewDesc}</strong>
                </div>

                {/* Quick actions for testing */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/80 w-full justify-center">
                  <button
                    onClick={handleCopyQrLink}
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Sao chép link</span>
                  </button>
                  <button
                    onClick={handleDownloadQr}
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Tải ảnh QR</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onlineUrl || qrUrl) {
                        window.open(onlineUrl || qrUrl, '_blank');
                      }
                    }}
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 text-blue-600" />
                    <span>Mở ảnh gốc</span>
                  </button>
                </div>
              </div>

              {/* Guidance Tips */}
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200/70 text-[11px] text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cơ chế VietQR tự động tại quầy POS:</span>
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Khi thu ngân chọn phương thức thanh toán <strong>"Chuyển khoản VietQR"</strong> tại màn hình bán hàng POS, hệ thống sẽ tự động tạo mã QR có sẵn chính xác số tiền cần trả và mã đơn hàng để khách chỉ cần quét và bấm chuyển tiền ngay mà không cần nhập tay!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standee Modal for printing */}
      <QrStandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        settings={formData}
      />
    </div>
  );
};
