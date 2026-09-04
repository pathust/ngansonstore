import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CashbookEntry } from '../../types';
import {
  parseExcelFile,
  formatCurrency,
  formatDateTime,
  downloadCashbookTemplate,
} from '../../utils/formatters';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface CashbookImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashbookImportModal: React.FC<CashbookImportModalProps> = ({ isOpen, onClose }) => {
  const { importCashbook, currentBranch, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewEntries, setPreviewEntries] = useState<CashbookEntry[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<'OVERWRITE' | 'SKIP'>('OVERWRITE');
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setErrors([]);

    try {
      const parsed = await parseExcelFile(file);
      if (!parsed.rows || parsed.rows.length === 0) {
        showToast('File Excel trống hoặc không đọc được dòng dữ liệu nào!', 'error');
        setIsProcessing(false);
        return;
      }

      const cleanEntries: CashbookEntry[] = [];
      const rowErrors: string[] = [];

      parsed.rows.forEach((row, idx) => {
        // Find voucher code
        const rawCode =
          row['Mã phiếu'] ||
          row['Mã Phiếu'] ||
          row['Mã phiếu thu/chi'] ||
          row['Mã chứng từ'] ||
          row['Code'] ||
          row['code'] ||
          '';

        const code = String(rawCode || '').trim() || `PT-${Date.now().toString().slice(-6)}-${idx + 1}`;

        // Date
        const rawTime =
          row['Thời gian'] ||
          row['Thời Gian'] ||
          row['Ngày tạo'] ||
          row['Ngày chứng từ'] ||
          row['Date'] ||
          row['date'] ||
          '';

        const createdAt = rawTime ? formatDateTime(rawTime) : new Date().toLocaleString('vi-VN');

        // Type
        const rawType = String(
          row['Loại thu chi'] ||
            row['Loại Thu Chi'] ||
            row['Loại'] ||
            row['Type'] ||
            row['Phân loại'] ||
            ''
        ).toLowerCase();

        const isOut =
          rawType.includes('chi') ||
          rawType.includes('out') ||
          rawType.includes('tra khach') ||
          rawType.includes('chi tien');

        const type: 'IN' | 'OUT' = isOut ? 'OUT' : 'IN';

        // Amount
        const rawAmount =
          row['Giá trị'] ||
          row['Giá Trị'] ||
          row['Số tiền'] ||
          row['Số Tiền'] ||
          row['Số tiền (đ)'] ||
          row['Amount'] ||
          0;

        let amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
        if (isNaN(amount) || amount <= 0) {
          rowErrors.push(`Dòng ${idx + 2}: Số tiền không hợp lệ (${rawAmount})`);
          amount = 0;
        }

        // Payer / Receiver
        const person = String(
          row['Người nộp/nhận'] ||
            row['Người nộp'] ||
            row['Người nhận'] ||
            row['Khách hàng'] ||
            row['Đối tác'] ||
            ''
        ).trim();

        // Category
        const category = String(
          row['Hạng mục'] ||
            row['Hạng Mục'] ||
            row['Nhóm thu chi'] ||
            row['Khoản mục'] ||
            (type === 'IN' ? 'Thu tiền bán hàng POS' : 'Chi phí vận hành')
        ).trim();

        // Note
        const note = String(
          row['Nội dung / Diễn giải'] ||
            row['Nội dung'] ||
            row['Diễn giải'] ||
            row['Ghi chú'] ||
            (person ? `Giao dịch với: ${person}` : '')
        ).trim();

        // Reference Code (Tự động bóc tách hóa đơn: TTHD004256 -> HD004256)
        let refCode = String(row['Chứng từ kèm theo'] || row['Mã hóa đơn'] || row['Mã tham chiếu'] || '').trim();
        if (!refCode && code.toUpperCase().startsWith('TTHD')) {
          refCode = 'HD' + code.slice(4);
        }

        cleanEntries.push({
          id: `cb-import-${idx}-${Date.now()}`,
          code,
          type,
          amount,
          category,
          note,
          ref_code: refCode,
          branch: currentBranch?.name || '318 Vũ Quang',
          created_at: createdAt,
        });
      });

      setPreviewEntries(cleanEntries);
      setErrors(rowErrors);
      showToast(`Đã đọc thành công ${cleanEntries.length} phiếu sổ quỹ từ file!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Lỗi khi đọc file: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (previewEntries.length === 0) return;

    const result = importCashbook(previewEntries, strategy === 'OVERWRITE');
    showToast(
      `Đã nạp ${result.inserted} phiếu mới, cập nhật ${result.updated} phiếu vào Sổ quỹ!`,
      'success'
    );
    onClose();
  };

  const totalIn = previewEntries.filter((e) => e.type === 'IN').reduce((s, e) => s + e.amount, 0);
  const totalOut = previewEntries.filter((e) => e.type === 'OUT').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">Nhập Dữ Liệu Sổ Quỹ (Thu / Chi)</h3>
              <p className="text-[11px] text-blue-100 mt-0.5">
                Hỗ trợ file Excel từ KiotViet, ERP hoặc mẫu chuẩn OmniERP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* File Upload Drop Area */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
              id="cashbook-file-upload"
            />
            <label
              htmlFor="cashbook-file-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0B63E5] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-800 hover:text-[#0B63E5]">
                  {fileName ? `File đã chọn: ${fileName}` : 'Bấm để tải lên file Excel sổ quỹ (.xlsx, .xls, .csv)'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tự động nhận diện cột: Mã phiếu, Thời gian, Loại thu chi, Giá trị, Người nộp/nhận, Chứng từ
                </p>
              </div>
            </label>

            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={downloadCashbookTemplate}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Tải file Excel mẫu Sổ Quỹ chuẩn
              </button>
            </div>
          </div>

          {/* Import Strategy */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-slate-800">Xử lý trùng mã phiếu:</span>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cb-strategy"
                  checked={strategy === 'OVERWRITE'}
                  onChange={() => setStrategy('OVERWRITE')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium">Ghi đè cập nhật (Khuyên dùng)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="cb-strategy"
                  checked={strategy === 'SKIP'}
                  onChange={() => setStrategy('SKIP')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 font-medium">Bỏ qua nếu đã có</span>
              </label>
            </div>
          </div>

          {/* Statistics summary */}
          {previewEntries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500 font-medium">Tổng số phiếu</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {previewEntries.length.toLocaleString('vi-VN')}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Phiếu Thu ({previewEntries.filter((e) => e.type === 'IN').length})
                </div>
                <div className="text-base font-bold text-emerald-700 mt-0.5">
                  {formatCurrency(totalIn)}
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Phiếu Chi ({previewEntries.filter((e) => e.type === 'OUT').length})
                </div>
                <div className="text-base font-bold text-rose-700 mt-0.5">
                  {formatCurrency(totalOut)}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                <div className="text-[11px] text-blue-700 font-medium">Chênh lệch dòng tiền</div>
                <div className="text-base font-bold text-blue-700 mt-0.5">
                  {formatCurrency(totalIn - totalOut)}
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {previewEntries.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100/70 px-3.5 py-2 font-bold text-slate-700 flex items-center justify-between">
                <span>Xem trước dữ liệu ({previewEntries.length} phiếu - hiển thị 15 dòng đầu):</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Tự động liên kết mã hóa đơn cho {previewEntries.filter((e) => e.ref_code).length} phiếu
                </span>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2 pl-3">Mã phiếu</th>
                      <th className="p-2">Thời gian</th>
                      <th className="p-2">Loại</th>
                      <th className="p-2">Số tiền</th>
                      <th className="p-2">Hạng mục / Ghi chú</th>
                      <th className="p-2 pr-3">Chứng từ liên quan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {previewEntries.slice(0, 15).map((e, i) => (
                      <tr key={i} className="hover:bg-blue-50/40">
                        <td className="p-2 pl-3 font-mono font-bold text-slate-800">{e.code}</td>
                        <td className="p-2 text-slate-600 whitespace-nowrap">{e.created_at}</td>
                        <td className="p-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              e.type === 'IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {e.type === 'IN' ? 'Thu (+)' : 'Chi (-)'}
                          </span>
                        </td>
                        <td
                          className={`p-2 font-bold ${
                            e.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="p-2 text-slate-700 max-w-xs truncate" title={e.note || e.category}>
                          <span className="font-semibold">{e.category}</span>
                          {e.note && <span className="text-slate-400"> - {e.note}</span>}
                        </td>
                        <td className="p-2 pr-3 font-mono text-blue-600 font-semibold">
                          {e.ref_code || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings / Errors */}
          {errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Có {errors.length} dòng dữ liệu chưa hoàn chỉnh (vẫn có thể nạp phần còn lại):</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 max-h-24 overflow-y-auto">
                {errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={previewEntries.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="px-5 py-2 rounded-lg bg-[#0B63E5] hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Xác nhận nhập ({previewEntries.length} phiếu)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
