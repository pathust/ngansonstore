import React, { useEffect, useRef, useState } from 'react';
import { StoreSettings } from '../../types';
import { getVietQRUrl } from '../../utils/formatters';
import { generateOfflineQrDataUrl } from '../../utils/vietqr';
import { Printer, X, Wifi, Sparkles, Building2, Phone, MapPin } from 'lucide-react';

interface QrStandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
}

export const QrStandeeModal: React.FC<QrStandeeModalProps> = ({ isOpen, onClose, settings }) => {
  const [offlineQrUrl, setOfflineQrUrl] = useState<string>('');
  const [hasImageError, setHasImageError] = useState<boolean>(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setHasImageError(false);
      generateOfflineQrDataUrl(
        settings.bankId || 'MB',
        settings.accountNumber || '0912345678',
        0,
        'THANH TOAN CUA HANG NGAN SON'
      )
        .then((url) => setOfflineQrUrl(url))
        .catch(console.error);
    }
  }, [isOpen, settings]);

  const standeeRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const qrUrl = settings.useCustomQr && settings.customQrImage
    ? settings.customQrImage
    : getVietQRUrl(
        settings.bankId || 'MB',
        settings.accountNumber || '0912345678',
        'compact2',
        0,
        'THANH TOAN CUA HANG NGAN SON',
        settings.accountHolder || 'PHAN ANH TAI'
      );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-6 print:border-none print:shadow-none print:max-w-none">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-5 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Standee Mã QR Để Bàn Thu Ngân</h3>
              <p className="text-xs text-blue-100">Bản in chuẩn A5/A6 chất lượng cao để đặt tại quầy thu ngân</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            💡 Gợi ý: In màu trên giấy bìa cứng hoặc ép plastic để bàn quầy thanh toán.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Standee Ngay</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Printable Standee Sheet */}
        <div className="p-6 bg-slate-100 flex justify-center print:p-0 print:bg-white">
          <div
            id="qr-standee-print-card"
            ref={standeeRef}
            className="bg-white w-full max-w-[380px] rounded-2xl p-6 border-2 border-slate-200 shadow-xl print:border-none print:shadow-none print:w-full print:max-w-none text-center relative overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500"></div>

            {/* Store Branding Header */}
            <div className="pt-2 pb-3">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold tracking-wider uppercase mb-2">
                <Building2 className="w-3 h-3" />
                <span>Thanh Toán Chuyển Khoản 24/7</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-snug">
                {settings.name || 'CỬA HÀNG NGÂN SƠN'}
              </h2>
              {settings.slogan && (
                <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-[280px] mx-auto leading-tight">
                  {settings.slogan}
                </p>
              )}
            </div>

            {/* Big High-Res QR Code Card */}
            <div className="my-2 bg-gradient-to-b from-slate-50 to-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md">
                <img
                  src={
                    settings.useCustomQr && settings.customQrImage
                      ? settings.customQrImage
                      : hasImageError && offlineQrUrl
                      ? offlineQrUrl
                      : (offlineQrUrl || qrUrl)
                  }
                  alt="VietQR Standee"
                  onError={() => setHasImageError(true)}
                  className="w-56 h-56 object-contain mx-auto"
                />
              </div>

              {/* Account Details Box */}
              <div className="mt-3.5 w-full bg-white rounded-xl p-3 border border-slate-200 text-left space-y-1.5 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Ngân hàng:</span>
                  <span className="font-bold text-blue-700">{settings.bankName || settings.bankId || 'MBBank'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Số tài khoản:</span>
                  <span className="font-mono font-black text-slate-900 text-sm tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {settings.accountNumber || '0912345678'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {settings.accountHolder || 'PHAN ANH TAI'}
                  </span>
                </div>
              </div>
            </div>

            {/* Wifi & Store Contact Info */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1.5 text-xs text-slate-600">
              {settings.wifiSsid && (
                <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-[11px] font-medium text-slate-700">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Wifi: <strong>{settings.wifiSsid}</strong></span>
                  {settings.wifiPassword && (
                    <>
                      <span>•</span>
                      <span>MK: <strong>{settings.wifiPassword}</strong></span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-500" />
                  {settings.address || '318 Vũ Quang, TP. Hà Tĩnh'}
                </span>
              </div>
              {settings.phone && (
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700">
                  <Phone className="w-3 h-3 text-blue-600" />
                  <span>Hotline: {settings.phone}</span>
                </div>
              )}
            </div>

            {/* Bottom Slogan */}
            <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic">
              Xin cảm ơn Quý khách đã tin tưởng và ủng hộ!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
