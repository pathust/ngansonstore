import React, { useEffect,  useState  } from 'react';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';
import { exportInvoiceToPdf } from '../../utils/pdfExport';
import { formatCurrency, formatDateTime, numberToVietnameseWords, getVietQRUrl } from '../../utils/formatters';
import {
  Download,
  Printer,
  X,
  FileText,
  Receipt,
  Check,
} from 'lucide-react';

interface InvoicePdfModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  branchName?: string;
}

export const InvoicePdfModal: React.FC<InvoicePdfModalProps> = ({
  order,
  isOpen,
  onClose,
  branchName = '318 Vũ Quang',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const { storeSettings, showToast } = useApp();
  const [format, setFormat] = useState<'K80' | 'A4'>('K80');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !order) return null;

  const handleExportPdf = async (autoPrint: boolean = false) => {
    try {
      setIsExporting(true);
      await exportInvoiceToPdf(order, {
        format,
        filename: `HoaDon_${order.code}_NganSon.pdf`,
        autoPrint,
        storeName: storeSettings.name || 'CỬA HÀNG ĐIỆN NƯỚC & KIM KHÍ NGÂN SƠN',
        storeAddress: storeSettings.address || '318 Vũ Quang, TP. Hà Tĩnh',
        storePhone: storeSettings.phone || '0912.345.678',
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
      setExportSuccess(true);
      showToast(autoPrint ? 'Đang mở lệnh in hóa đơn...' : 'Đã xuất hóa đơn PDF thành công!', 'success');
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Có lỗi khi tạo hóa đơn PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const qrMemo = storeSettings.transferSyntaxPrefix
    ? storeSettings.transferSyntaxPrefix.replace('{order_code}', order.code)
    : `NGANSON ${order.code}`;

  const qrUrl = storeSettings.useCustomQr && storeSettings.customQrImage
    ? storeSettings.customQrImage
    : order.final_amount > 0
    ? getVietQRUrl(
        storeSettings.bankId || 'ICB',
        storeSettings.accountNumber || '106877069794',
        storeSettings.qrTemplate || 'compact2',
        order.final_amount,
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

  const wordsAmount = numberToVietnameseWords(order.final_amount);
  const paymentMethodLabel =
    order.payment_method === 'CASH'
      ? 'Tiền mặt'
      : order.payment_method === 'TRANSFER'
      ? 'Chuyển khoản VietQR'
      : 'Thẻ ngân hàng (POS)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Xuất Hóa Đơn PDF & In Ấn</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Mã hóa đơn: <strong className="text-white font-mono">{order.code}</strong> • {formatDateTime(order.created_at)}
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

        {/* Toolbar & Template Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Định dạng hóa đơn:</span>
            <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
              <button
                onClick={() => setFormat('K80')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  format === 'K80'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                In nhiệt K80 (80mm)
              </button>
              <button
                onClick={() => setFormat('A4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  format === 'A4'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Hóa đơn A4 Chuẩn
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isExporting}
              onClick={() => handleExportPdf(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In hóa đơn
            </button>
            <button
              disabled={isExporting}
              onClick={() => handleExportPdf(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {exportSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Đã tải PDF!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Đang tạo PDF...' : 'Tải xuống PDF'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-6 bg-slate-100/70 max-h-[65vh] overflow-y-auto flex justify-center">
          {format === 'K80' ? (
            <div className="bg-white p-5 w-full max-w-[340px] shadow-sm border border-slate-200 rounded-md text-slate-900 font-mono text-xs leading-relaxed">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <div className="font-bold text-sm text-slate-900 uppercase">
                  {storeSettings.name || 'CỬA HÀNG NGÂN SƠN'}
                </div>
                {storeSettings.showSloganOnReceipt && storeSettings.slogan && (
                  <div className="text-[10px] text-slate-500 italic mt-0.5">{storeSettings.slogan}</div>
                )}
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  {storeSettings.address || '318 Vũ Quang, TP. Hà Tĩnh'}
                </div>
                <div className="text-[10px] text-slate-500">
                  Hotline: {storeSettings.phone || '0912.345.678'}
                </div>
                {storeSettings.showTaxCodeOnReceipt && storeSettings.taxCode && (
                  <div className="text-[10px] text-slate-500 font-mono">MST: {storeSettings.taxCode}</div>
                )}
                <div className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                  HÓA ĐƠN BÁN HÀNG
                </div>
                <div className="text-[11px] font-semibold text-blue-700">{order.code}</div>
              </div>

              <div className="py-2.5 text-[11px] space-y-0.5 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày in:</span>
                  <span>{formatDateTime(order.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thu ngân:</span>
                  <span>{order.cashier || 'Phan Minh'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng:</span>
                  <span className="font-medium text-slate-800">{order.customer_name || 'Khách lẻ'}</span>
                </div>
                {order.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">SĐT:</span>
                    <span>{order.phone}</span>
                  </div>
                )}
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-300">
                <div className="grid grid-cols-12 font-bold text-[10px] uppercase text-slate-600 pb-1 border-b border-slate-200">
                  <div className="col-span-6">Mặt hàng</div>
                  <div className="col-span-2 text-center">SL</div>
                  <div className="col-span-4 text-right">T.Tiền</div>
                </div>
                <div className="divide-y divide-slate-100 text-[11px] pt-1">
                  {order.items.map((item, idx) => (
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

              <div className="py-2.5 text-[11px] space-y-1 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tổng tiền hàng:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Chiết khấu:</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200 text-slate-950">
                  <span>KHÁCH CẦN TRẢ:</span>
                  <span className="text-blue-700 text-sm">{formatCurrency(order.final_amount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Hình thức:</span>
                  <span className="font-medium">{paymentMethodLabel}</span>
                </div>
                <div className="text-[10px] italic text-slate-500 mt-1">
                  Bằng chữ: {wordsAmount}
                </div>
              </div>

              <div className="pt-3 pb-1 text-center flex flex-col items-center">
                {storeSettings.showQrOnK80Receipt && (
                  <div className="p-1.5 bg-white border border-slate-200 rounded inline-block">
                    <img src={qrUrl} alt="VietQR" className="w-20 h-20 object-contain mx-auto" />
                  </div>
                )}
                <div className="mt-2 text-[10px] italic text-slate-500">
                  {storeSettings.receiptFooterNote || 'Cảm ơn quý khách & Hẹn gặp lại!'}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 w-full max-w-[620px] shadow-sm border border-slate-200 rounded-md text-slate-800 text-xs leading-normal">
              <div className="flex justify-between items-start border-b-2 border-blue-600 pb-3 mb-4">
                <div>
                  <div className="font-black text-base text-blue-900 uppercase">
                    {storeSettings.name || 'CỬA HÀNG ĐIỆN NƯỚC & KIM KHÍ NGÂN SƠN'}
                  </div>
                  {storeSettings.slogan && (
                    <div className="text-[10px] text-slate-500 italic mt-0.5">{storeSettings.slogan}</div>
                  )}
                  <div className="text-[11px] text-slate-600 mt-1">📍 {storeSettings.address || '318 Vũ Quang, TP. Hà Tĩnh'}</div>
                  <div className="text-[11px] text-slate-600">📞 Hotline: {storeSettings.phone || '0912.345.678'}</div>
                  {storeSettings.taxCode && (
                    <div className="text-[10px] text-slate-500 font-mono">MST: {storeSettings.taxCode}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-blue-700 uppercase">HÓA ĐƠN BÁN HÀNG</div>
                  <div className="font-bold text-xs text-slate-700 mt-0.5">Số: {order.code}</div>
                  <div className="text-[10px] text-slate-500">Ngày: {formatDateTime(order.created_at)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 text-[11px]">
                <div>
                  <div>Khách hàng: <strong className="text-slate-900">{order.customer_name || 'Khách lẻ'}</strong></div>
                  <div>Điện thoại: <strong>{order.phone || '—'}</strong></div>
                  <div>Thanh toán: <strong className="text-blue-700">{paymentMethodLabel}</strong></div>
                </div>
                <div>
                  <div>Thu ngân: <strong>{order.cashier || 'Phan Minh'}</strong></div>
                  <div>Chi nhánh: <strong>{order.branch || branchName}</strong></div>
                  <div>Trạng thái: <strong className="text-emerald-600">Hoàn thành</strong></div>
                </div>
              </div>

              <table className="w-full border-collapse mb-4 text-[11px]">
                <thead>
                  <tr className="bg-blue-800 text-white font-bold text-left">
                    <th className="p-1.5 border border-blue-800 w-8 text-center">STT</th>
                    <th className="p-1.5 border border-blue-800">Tên mặt hàng</th>
                    <th className="p-1.5 border border-blue-800 w-12 text-center">ĐVT</th>
                    <th className="p-1.5 border border-blue-800 w-10 text-center">SL</th>
                    <th className="p-1.5 border border-blue-800 text-right w-20">Đơn giá</th>
                    <th className="p-1.5 border border-blue-800 text-right w-24">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-1.5 border border-slate-200 text-center font-medium">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-200 font-medium text-slate-900">{item.name}</td>
                      <td className="p-1.5 border border-slate-200 text-center text-slate-500">{item.unit}</td>
                      <td className="p-1.5 border border-slate-200 text-center font-bold">{item.quantity}</td>
                      <td className="p-1.5 border border-slate-200 text-right text-slate-600">{formatCurrency(item.price)}</td>
                      <td className="p-1.5 border border-slate-200 text-right font-bold text-slate-900">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-start mb-4">
                {storeSettings.showQrOnA4Invoice ? (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <img src={qrUrl} alt="VietQR" className="w-14 h-14" />
                    <div className="text-[10px] text-slate-600">
                      <div className="font-bold text-slate-800">{storeSettings.bankName || storeSettings.bankId}</div>
                      <div>STK: {storeSettings.accountNumber}</div>
                      <div className="uppercase font-semibold">{storeSettings.accountHolder}</div>
                    </div>
                  </div>
                ) : (
                  <div></div>
                )}

                <div className="w-56 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Chiết khấu:</span>
                      <span className="font-bold">-{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-200 text-blue-700">
                    <span>TỔNG THANH TOÁN:</span>
                    <span>{formatCurrency(order.final_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] italic text-slate-600 border-t border-dashed border-slate-300 pt-2 mb-6">
                Bằng chữ: <strong>{wordsAmount}</strong>
              </div>

              <div className="grid grid-cols-2 text-center text-[11px] pt-2">
                <div>
                  <div className="font-bold uppercase">Người mua hàng</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký rõ họ tên)</div>
                  <div className="h-10"></div>
                  <div className="font-medium text-slate-700">{order.customer_name || 'Khách lẻ'}</div>
                </div>
                <div>
                  <div className="font-bold uppercase">Người lập phiếu</div>
                  <div className="text-[10px] text-slate-400 italic">(Ký đóng dấu)</div>
                  <div className="h-10"></div>
                  <div className="font-bold text-blue-700">{order.cashier || 'Phan Minh'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
