import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDateTime, getVietQRUrl } from '../../utils/formatters';
import { exportInvoiceToPdf } from '../../utils/pdfExport';
import { Printer, X, Check, Download, FileText } from 'lucide-react';

export const ThermalReceiptModal: React.FC = () => {
  const { isReceiptModalOpen, setIsReceiptModalOpen, lastCompletedOrder, currentBranch, showToast, storeSettings } = useApp();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isReceiptModalOpen || !lastCompletedOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async (format: 'K80' | 'A4', autoPrint: boolean = false) => {
    try {
      setIsExporting(true);
      await exportInvoiceToPdf(lastCompletedOrder, {
        format,
        filename: `HoaDon_${lastCompletedOrder.code}_NganSon.pdf`,
        autoPrint,
        storeName: storeSettings.name || 'CỬA HÀNG NGÂN SƠN',
        storeAddress: storeSettings.address || '318 Vũ Quang, TP. Hà Tĩnh',
        storePhone: storeSettings.phone || currentBranch?.phone || '0912.345.678',
        storeTaxCode: storeSettings.taxCode,
        storeSlogan: storeSettings.slogan,
        storeWifi: storeSettings.showWifiOnReceipt && storeSettings.wifiSsid ? `${storeSettings.wifiSsid}${storeSettings.wifiPassword ? ` / MK: ${storeSettings.wifiPassword}` : ''}` : undefined,
        footerNote: storeSettings.receiptFooterNote,
        bankId: storeSettings.bankId,
        bankName: storeSettings.bankName,
        accountNumber: storeSettings.accountNumber,
        accountHolder: storeSettings.accountHolder,
        showQr: format === 'K80' ? storeSettings.showQrOnK80Receipt : storeSettings.showQrOnA4Invoice,
        customQrImage: storeSettings.useCustomQr ? storeSettings.customQrImage : undefined,
      });
      showToast(autoPrint ? 'Đang mở lệnh in hóa đơn...' : 'Đã xuất hóa đơn PDF thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi khi xuất PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const qrMemo = storeSettings.transferSyntaxPrefix
    ? storeSettings.transferSyntaxPrefix.replace('{order_code}', lastCompletedOrder.code)
    : `NGANSON ${lastCompletedOrder.code}`;

  const qrUrl = storeSettings.useCustomQr && storeSettings.customQrImage
    ? storeSettings.customQrImage
    : lastCompletedOrder.final_amount > 0
    ? getVietQRUrl(
        storeSettings.bankId || 'ICB',
        storeSettings.accountNumber || '106877069794',
        storeSettings.qrTemplate || 'compact2',
        lastCompletedOrder.final_amount,
        qrMemo,
        storeSettings.accountHolder || 'PHAN ANH TAI'
      )
    : (storeSettings.savedQrCode || getVietQRUrl(
        storeSettings.bankId || 'ICB',
        storeSettings.accountNumber || '106877069794',
        storeSettings.qrTemplate || 'compact2',
        0,
        qrMemo,
        storeSettings.accountHolder || 'PHAN ANH TAI'
      ));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Modal Topbar Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <h3 className="font-semibold text-base">Thanh toán hoàn tất</h3>
          </div>
          <button
            onClick={() => setIsReceiptModalOpen(false)}
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Actions Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              disabled={isExporting}
              onClick={() => handleExportPdf('K80', false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tải PDF (K80)
            </button>
            <button
              disabled={isExporting}
              onClick={() => handleExportPdf('A4', false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Tải PDF (A4)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isExporting}
              onClick={() => handleExportPdf('K80', true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              In hóa đơn (PDF)
            </button>
            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>


        {/* Printable K80 Receipt Content */}
        <div className="p-6 bg-slate-100/70 max-h-[65vh] overflow-y-auto flex justify-center">
          <div
            id="k80-thermal-receipt"
            ref={receiptRef}
            className="bg-white p-5 w-full max-w-[320px] shadow-sm border border-slate-200 rounded-sm text-slate-900 font-mono text-xs leading-relaxed"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-center mb-1.5">
                <img src="/logo.png" alt="Ngân Sơn" className="w-9 h-9 object-contain" />
              </div>
              <div className="font-bold text-sm text-slate-900 tracking-tight uppercase">
                {storeSettings.name || 'CỬA HÀNG NGÂN SƠN'}
              </div>
              {storeSettings.showSloganOnReceipt && storeSettings.slogan && (
                <div className="text-[10px] text-slate-500 italic mt-0.5">{storeSettings.slogan}</div>
              )}
              <div className="text-[11px] text-slate-600 font-medium mt-1">
                {storeSettings.address || '318 Vũ Quang, TP. Hà Tĩnh'}
              </div>
              <div className="text-[10px] text-slate-500">
                Hotline: {storeSettings.phone || currentBranch?.phone || '0912.345.678'}
                {storeSettings.secondaryPhone && ` - ${storeSettings.secondaryPhone}`}
              </div>
              {storeSettings.showTaxCodeOnReceipt && storeSettings.taxCode && (
                <div className="text-[10px] text-slate-500 font-mono">MST: {storeSettings.taxCode}</div>
              )}
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                HÓA ĐƠN BÁN HÀNG
              </div>
              <div className="text-[11px] font-semibold text-blue-700">{lastCompletedOrder.code}</div>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 text-[11px] space-y-0.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày in:</span>
                <span>{formatDateTime(lastCompletedOrder.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thu ngân:</span>
                <span>{lastCompletedOrder.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-medium text-slate-800">{lastCompletedOrder.customer_name}</span>
              </div>
              {lastCompletedOrder.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">SĐT:</span>
                  <span>{lastCompletedOrder.phone}</span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-600 pb-1 border-b border-slate-200">
                <div className="col-span-6">Tên mặt hàng</div>
                <div className="col-span-2 text-center">SL</div>
                <div className="col-span-4 text-right">T.Tiền</div>
              </div>
              <div className="divide-y divide-slate-100 text-[11px] pt-1">
                {lastCompletedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-1.5">
                    <div className="font-medium text-slate-900 leading-snug">{item.name}</div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>{item.quantity} {item.unit} x {formatCurrency(item.price)}</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(item.quantity * item.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations */}
            <div className="py-2.5 text-[11px] space-y-1.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-600">Tổng tiền hàng:</span>
                <span>{formatCurrency(lastCompletedOrder.total)}</span>
              </div>
              {lastCompletedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Chiết khấu / Giảm giá:</span>
                  <span>-{formatCurrency(lastCompletedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200 text-slate-950">
                <span>KHÁCH CẦN TRẢ:</span>
                <span className="text-blue-700 text-sm">{formatCurrency(lastCompletedOrder.final_amount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Hình thức:</span>
                <span className="font-medium">
                  {lastCompletedOrder.payment_method === 'CASH'
                    ? 'Tiền mặt'
                    : lastCompletedOrder.payment_method === 'TRANSFER'
                    ? 'Chuyển khoản VietQR'
                    : 'Thẻ ngân hàng (POS)'}
                </span>
              </div>
            </div>

            {/* Dynamic VietQR & Footer in Receipt */}
            <div className="pt-3 pb-1 text-center flex flex-col items-center">
              {storeSettings.showQrOnK80Receipt && (
                <>
                  <div className="text-[10px] text-slate-500 mb-1">Mã tra cứu hóa đơn & Thanh toán VietQR</div>
                  <div className="p-1.5 bg-white border border-slate-300 rounded inline-block shadow-2xs">
                    <img
                      src={qrUrl}
                      alt="VietQR Invoice"
                      className="w-24 h-24 object-contain mx-auto"
                    />
                  </div>
                </>
              )}

              {storeSettings.showWifiOnReceipt && storeSettings.wifiSsid && (
                <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">
                  Wifi: <strong>{storeSettings.wifiSsid}</strong> {storeSettings.wifiPassword && `(MK: ${storeSettings.wifiPassword})`}
                </div>
              )}

              <div className="mt-2 text-[10px] italic text-slate-600 leading-tight max-w-[260px]">
                {storeSettings.receiptFooterNote || 'Cảm ơn quý khách & Hẹn gặp lại!'}
              </div>
              <div className="text-[9px] text-slate-400 mt-1">
                Cửa hàng Ngân Sơn - 318 Vũ Quang
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
