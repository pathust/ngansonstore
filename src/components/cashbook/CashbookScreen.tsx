import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CashbookEntry } from '../../types';
import { formatCurrency, formatDateTime, parseDateToTimestamp, exportToExcel } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
import {
  ReceiptText,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Search,
  Download,
  Upload,
  X
} from 'lucide-react';
import { CashbookImportModal } from './CashbookImportModal';

interface CashbookScreenProps {
  isCashModalOpen?: boolean;
  setIsCashModalOpen?: (open: boolean) => void;
  defaultType?: 'IN' | 'OUT';
}

export const CashbookScreen: React.FC<CashbookScreenProps> = ({
  isCashModalOpen: externalModalOpen,
  setIsCashModalOpen: setExternalModalOpen,
  defaultType = 'IN',
}) => {
  const { cashbookEntries, addCashbookEntry, showToast, currentUser } = useApp();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = setExternalModalOpen || setInternalModalOpen;

  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [search, setSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Form State for new entry
  const [entryType, setEntryType] = useState<'IN' | 'OUT'>(defaultType);
  const [amount, setAmount] = useState<number>(100000);
  const [category, setCategory] = useState<string>('Thu tiền bán hàng POS');
  const [note, setNote] = useState<string>('');
  const [refCode, setRefCode] = useState<string>('');

  // Calculate Running Totals
  const totalIn = cashbookEntries
    .filter((e) => e.type === 'IN')
    .reduce((s, e) => s + e.amount, 0);

  const totalOut = cashbookEntries
    .filter((e) => e.type === 'OUT')
    .reduce((s, e) => s + e.amount, 0);

  const balance = totalIn - totalOut;

  // Filter & sort list descending (mới nhất lên đầu)
  const filteredEntries = cashbookEntries
    .filter((e) => {
      const matchType = filterType === 'ALL' || e.type === filterType;
      const matchSearch =
        search.trim() === '' ||
        e.code.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        e.note.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    })
    .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));

  const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenCreate = (type: 'IN' | 'OUT') => {
    setEntryType(type);
    setCategory(type === 'IN' ? 'Thu tiền bán hàng ngoài' : 'Chi phí vận hành');
    setAmount(100000);
    setNote('');
    setRefCode('');
    setModalOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      showToast('Số tiền thu/chi phải lớn hơn 0!', 'error');
      return;
    }

    const created = addCashbookEntry({
      type: entryType,
      amount,
      category,
      note: note || (entryType === 'IN' ? 'Phiếu thu tiền mặt' : 'Phiếu chi tiền mặt'),
      ref_code: refCode,
    });

    showToast(`Đã lập ${entryType === 'IN' ? 'Phiếu thu' : 'Phiếu chi'} ${created.code}`, 'success');
    setModalOpen(false);
  };

  const handleExportCashbook = () => {
    const data = cashbookEntries.map((c) => ({
      'Mã Phiếu': c.code,
      'Thời Gian': c.created_at,
      'Loại': c.type === 'IN' ? 'Thu (+)' : 'Chi (-)',
      'Số Tiền (đ)': c.amount,
      'Hạng Mục': c.category,
      'Nội Dung / Diễn Giải': c.note,
      'Chứng Từ Kèm Theo': c.ref_code || '',
      'Chi Nhánh': c.branch,
    }));
    exportToExcel(data, 'So_quy_tien_mat', 'SoQuy');
    showToast('Đã xuất sổ quỹ ra file Excel!', 'success');
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-[#0B63E5]" />
            Sổ quỹ (Quản lý Thu - Chi tiền mặt)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi dòng tiền thu chi bán hàng, mua hàng và chi phí vận hành cửa hàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-[#0B63E5] hover:bg-blue-100 shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0B63E5]" />
              <span>Nhập sổ quỹ</span>
            </button>
          )}
          <button
            onClick={handleExportCashbook}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => handleOpenCreate('IN')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Lập phiếu Thu</span>
          </button>
          <button
            onClick={() => handleOpenCreate('OUT')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Lập phiếu Chi</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Total IN, Total OUT, Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total In */}
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Tổng tiền Thu (+)</div>
            <div className="text-lg font-bold text-emerald-600 tracking-tight">{formatCurrency(totalIn)}</div>
          </div>
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Total Out */}
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Tổng tiền Chi (-)</div>
            <div className="text-lg font-bold text-rose-600 tracking-tight">{formatCurrency(totalOut)}</div>
          </div>
          <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Running Balance */}
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Tồn quỹ tiền mặt</div>
            <div className="text-lg font-bold text-[#0B63E5] tracking-tight">{formatCurrency(balance)}</div>
          </div>
          <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0B63E5] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã phiếu, hạng mục, diễn giải..."
            className="w-full pl-7 pr-2.5 py-1 bg-slate-50 text-xs text-slate-900 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#0B63E5]"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs font-semibold">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({cashbookEntries.length})
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filterType === 'IN' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phiếu Thu
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
              filterType === 'OUT' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phiếu Chi
          </button>
        </div>
      </div>

      {/* Cashbook Entries Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="table-header border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2 px-3">Mã Phiếu</th>
                <th className="py-2 px-2.5">Thời gian</th>
                <th className="py-2 px-2.5">Loại</th>
                <th className="py-2 px-2.5">Hạng mục</th>
                <th className="py-2 px-2.5">Nội dung / Ghi chú</th>
                <th className="py-2 px-2.5">Chứng từ gốc</th>
                <th className="py-2 px-3 text-right">Số tiền (VNĐ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy phiếu thu/chi nào
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((item) => {
                  const isIncome = item.type === 'IN';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{item.code}</td>
                      <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap">{formatDateTime(item.created_at)}</td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`badge-${isIncome ? 'green' : 'red'}`}
                        >
                          {isIncome ? 'Thu tiền' : 'Chi tiền'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-slate-800">{item.category}</td>
                      <td className="py-2 px-2.5 text-slate-600 max-w-[240px] truncate">{item.note}</td>
                      <td className="py-2 px-2.5 font-mono text-[#0B63E5]">{item.ref_code || '-'}</td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredEntries.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="phiếu thu/chi"
        />
      </div>

      {/* CREATE CASHBOOK ENTRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div
              className={`px-5 py-4 text-white flex items-center justify-between ${
                entryType === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              <h3 className="font-bold text-base">
                {entryType === 'IN' ? 'Lập Phiếu Thu Tiền Mặt' : 'Lập Phiếu Chi Tiền Mặt'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEntry} className="p-5 space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEntryType('IN')}
                  className={`py-2 rounded-md font-bold transition-all ${
                    entryType === 'IN' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Phiếu Thu (+)
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('OUT')}
                  className={`py-2 rounded-md font-bold transition-all ${
                    entryType === 'OUT' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Phiếu Chi (-)
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Số tiền (VNĐ) *</label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-lg font-bold text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hạng mục thu/chi:</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ví dụ: Thu nợ khách, Chi tiền điện nước..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* Note */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Diễn giải / Ghi chú:</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nội dung chi tiết của khoản tiền..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-600 outline-none resize-none"
                />
              </div>

              {/* Reference Code */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mã chứng từ liên quan (nếu có):</label>
                <input
                  type="text"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  placeholder="HD-..., NK-..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg text-white font-bold shadow-sm ${
                    entryType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Lưu phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cashbook Excel Import Modal (Admin Only) */}
      <CashbookImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
