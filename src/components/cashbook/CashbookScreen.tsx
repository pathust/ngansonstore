import React, { useState, useMemo } from 'react';
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
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
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

  // Filter & sort list descending (mới nhất lên đầu)
  const filteredEntries = useMemo(() => {
    return cashbookEntries
      .filter((e) => {
        const matchType = filterType === 'ALL' || e.type === filterType;
        const matchSearch =
          search.trim() === '' ||
          e.code.toLowerCase().includes(search.toLowerCase()) ||
          e.category.toLowerCase().includes(search.toLowerCase()) ||
          e.note.toLowerCase().includes(search.toLowerCase());
        if (!matchType || !matchSearch) return false;

        // Date Filter
        if (dateFilter !== 'ALL') {
          const entryTs = parseDateToTimestamp(e.created_at);
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

          if (dateFilter === 'TODAY') {
            if (entryTs < startOfToday || entryTs > endOfToday) return false;
          } else if (dateFilter === 'YESTERDAY') {
            const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
            const endOfYesterday = startOfToday - 1;
            if (entryTs < startOfYesterday || entryTs > endOfYesterday) return false;
          } else if (dateFilter === 'LAST7') {
            const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
            if (entryTs < sevenDaysAgo || entryTs > endOfToday) return false;
          } else if (dateFilter === 'MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();
            if (entryTs < startOfMonth || entryTs > endOfToday) return false;
          } else if (dateFilter === 'CUSTOM') {
            if (customStartDate) {
              const [sy, sm, sd] = customStartDate.split('-').map(Number);
              if (sy && sm && sd) {
                const startTs = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();
                if (entryTs < startTs) return false;
              }
            }
            if (customEndDate) {
              const [ey, em, ed] = customEndDate.split('-').map(Number);
              if (ey && em && ed) {
                const endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
                if (entryTs > endTs) return false;
              }
            }
          }
        }

        return true;
      })
      .sort((a, b) => parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at));
  }, [cashbookEntries, filterType, search, dateFilter, customStartDate, customEndDate]);

  // Running Ledger Balances (All-time)
  const totalInAll = useMemo(() => cashbookEntries.filter((e) => e.type === 'IN').reduce((s, e) => s + e.amount, 0), [cashbookEntries]);
  const totalOutAll = useMemo(() => cashbookEntries.filter((e) => e.type === 'OUT').reduce((s, e) => s + e.amount, 0), [cashbookEntries]);
  const balanceAll = totalInAll - totalOutAll;

  // Filtered Totals
  const filteredIn = useMemo(() => filteredEntries.filter((e) => e.type === 'IN').reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const filteredOut = useMemo(() => filteredEntries.filter((e) => e.type === 'OUT').reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const filteredNet = filteredIn - filteredOut;

  const isFiltered = useMemo(() => {
    return filterType !== 'ALL' || dateFilter !== 'ALL' || search.trim() !== '' || customStartDate !== '' || customEndDate !== '';
  }, [filterType, dateFilter, search, customStartDate, customEndDate]);

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
    if (filteredEntries.length === 0) {
      showToast('Không có dữ liệu phiếu thu chi để xuất Excel!', 'warning');
      return;
    }
    const data = filteredEntries.map((c) => ({
      'Mã Phiếu': c.code,
      'Thời Gian': c.created_at,
      'Loại': c.type === 'IN' ? 'Thu (+)' : 'Chi (-)',
      'Số Tiền (đ)': c.amount,
      'Hạng Mục': c.category,
      'Nội Dung / Diễn Giải': c.note,
      'Chứng Từ Kèm Theo': c.ref_code || '',
      'Chi Nhánh': c.branch,
    }));
    exportToExcel(data, `So_quy_tien_mat_${dateFilter}`, 'SoQuy');
    showToast(`Đã xuất ${filteredEntries.length} phiếu sổ quỹ ra file Excel!`, 'success');
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
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
              <span>Tổng tiền Thu (+)</span>
              {isFiltered && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold">Lọc</span>}
            </div>
            <div className="text-lg font-bold text-emerald-600 tracking-tight">
              {formatCurrency(isFiltered ? filteredIn : totalInAll)}
            </div>
            {isFiltered && (
              <div className="text-[10px] text-slate-400 mt-0.5">Toàn thời gian: {formatCurrency(totalInAll)}</div>
            )}
          </div>
          <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Total Out */}
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
              <span>Tổng tiền Chi (-)</span>
              {isFiltered && <span className="text-[10px] bg-rose-100 text-rose-700 px-1 rounded font-bold">Lọc</span>}
            </div>
            <div className="text-lg font-bold text-rose-600 tracking-tight">
              {formatCurrency(isFiltered ? filteredOut : totalOutAll)}
            </div>
            {isFiltered && (
              <div className="text-[10px] text-slate-400 mt-0.5">Toàn thời gian: {formatCurrency(totalOutAll)}</div>
            )}
          </div>
          <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Running Balance */}
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
              <span>{isFiltered ? 'Chênh lệch kỳ lọc' : 'Tồn quỹ tiền mặt'}</span>
              {isFiltered && <span className="text-[10px] bg-blue-100 text-[#0B63E5] px-1 rounded font-bold">Lọc</span>}
            </div>
            <div className={`text-lg font-bold tracking-tight ${isFiltered ? (filteredNet >= 0 ? 'text-[#0B63E5]' : 'text-rose-600') : 'text-[#0B63E5]'}`}>
              {formatCurrency(isFiltered ? filteredNet : balanceAll)}
            </div>
            {isFiltered && (
              <div className="text-[10px] text-slate-500 mt-0.5">Tồn quỹ hiện tại: <strong>{formatCurrency(balanceAll)}</strong></div>
            )}
          </div>
          <div className="w-8 h-8 rounded-md bg-blue-50 text-[#0B63E5] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-2.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5 flex-wrap">
        <div className="relative flex-1 w-full md:w-auto min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo mã phiếu, hạng mục, diễn giải..."
            className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 text-xs text-slate-900 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#0B63E5]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 rounded-md focus:outline-none focus:border-[#0B63E5] text-xs cursor-pointer"
          >
            <option value="ALL">📅 Tất cả thời gian</option>
            <option value="TODAY">📅 Hôm nay</option>
            <option value="YESTERDAY">📅 Hôm qua</option>
            <option value="LAST7">📅 7 ngày qua</option>
            <option value="MONTH">📅 Tháng này</option>
            <option value="CUSTOM">📅 Tùy chọn ngày...</option>
          </select>

          {/* Custom Date Inputs */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 border border-slate-200 rounded-md">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-700 outline-none"
                title="Từ ngày"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-700 outline-none"
                title="Đến ngày"
              />
            </div>
          )}

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs font-semibold">
            <button
              onClick={() => {
                setFilterType('ALL');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({cashbookEntries.length})
            </button>
            <button
              onClick={() => {
                setFilterType('IN');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                filterType === 'IN' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phiếu Thu
            </button>
            <button
              onClick={() => {
                setFilterType('OUT');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                filterType === 'OUT' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phiếu Chi
            </button>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType('ALL');
                setDateFilter('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold border border-rose-200 rounded-md text-xs cursor-pointer transition-colors"
              title="Xóa tất cả bộ lọc"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa lọc ({filteredEntries.length}/{cashbookEntries.length})</span>
            </button>
          )}
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
