import React, { useState } from 'react';
import { useCatalog } from '../../context/slices/CatalogContext';
import { useInventoryAudit } from '../../context/slices/InventoryAuditContext';
import { useCatalogOrchestrator } from '../../context/orchestrators/useCatalogOrchestrator';
import { useToast } from '../../context/slices/ToastContext';
import { InventoryAuditItem, InventoryAudit } from '../../types';
import { formatCurrency, formatDate, parseDateToTimestamp, exportToExcel } from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
import {
  Warehouse,
  Plus,
  Search,
  CheckCircle2,
  Download,
  X
} from 'lucide-react';

interface InventoryAuditScreenProps {
  isCreateAuditModalOpen?: boolean;
  setIsCreateAuditModalOpen?: (open: boolean) => void;
}

export const InventoryAuditScreen: React.FC<InventoryAuditScreenProps> = ({
  isCreateAuditModalOpen: externalModalOpen,
  setIsCreateAuditModalOpen: setExternalModalOpen,
}) => {
  const { products } = useCatalog();
  const { inventoryAudits } = useInventoryAudit();
  const { createInventoryAudit, balanceInventoryAudit } = useCatalogOrchestrator();
  const { showToast } = useToast();

  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const isModalOpen = externalModalOpen !== undefined ? externalModalOpen : internalModalOpen;
  const setModalOpen = setExternalModalOpen || setInternalModalOpen;

  const [auditorName, setAuditorName] = useState('Nguyễn Văn Hùng (Kho Trưởng)');
  const [auditNotes, setAuditNotes] = useState('');
  const [auditItems, setAuditItems] = useState<
    Array<{
      product_id: string;
      sku: string;
      name: string;
      unit: string;
      system_stock: number;
      actual_stock: number;
      reason: 'Hao hụt tự nhiên' | 'Vỡ hỏng' | 'Mất mát / Thất thoát' | 'Sai lệch kiểm đếm' | 'Khác' | '';
    }>
  >([]);

  const [selectedAuditDetail, setSelectedAuditDetail] = useState<InventoryAudit | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleOpenCreateModal = () => {
    // Populate items with all active products
    const initialItems = products.map((p) => ({
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      system_stock: p.stock,
      actual_stock: p.stock, // Default to system stock
      reason: '' as any,
    }));
    setAuditItems(initialItems);
    setAuditorName('Nguyễn Văn Hùng (Kho Trưởng)');
    setAuditNotes('Kiểm kê định kỳ toàn kho hàng');
    setModalOpen(true);
  };

  const handleItemCountChange = (productId: string, actualCount: number) => {
    setAuditItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              actual_stock: Math.max(0, actualCount),
              reason: item.actual_stock !== item.system_stock && !item.reason ? 'Hao hụt tự nhiên' : item.reason,
            }
          : item
      )
    );
  };

  const handleReasonChange = (productId: string, reason: any) => {
    setAuditItems((prev) =>
      prev.map((item) => (item.product_id === productId ? { ...item, reason } : item))
    );
  };

  const handleSaveAudit = () => {
    const created = createInventoryAudit(auditorName, auditItems, auditNotes);
    setModalOpen(false);
    setSelectedAuditDetail(created);
  };

  const handleExportAuditList = () => {
    const exportData = inventoryAudits.flatMap((a) =>
      a.items.map((i) => ({
        'Mã Phiếu': a.code,
        'Ngày Kiểm': a.date,
        'Người Kiểm': a.auditor,
        'Trạng Thái': a.status === 'BALANCED' ? 'Đã cân bằng kho' : 'Đang kiểm kê',
        'Mã SKU': i.sku,
        'Tên Sản Phẩm': i.name,
        'ĐVT': i.unit,
        'Tồn Hệ Thống': i.system_stock,
        'Thực Tế Kiểm': i.actual_stock,
        'Chênh Lệch': i.diff,
        'Giá Trị Lệch (đ)': i.diff_value,
        'Lý Do': i.reason || 'Không có',
      }))
    );
    exportToExcel(exportData, 'So_kiem_ke_kho', 'KiemKe');
    showToast('Đã xuất sổ kiểm kê kho sang Excel!', 'success');
  };

  // Filtered audits sorted descending (mới nhất lên đầu)
  const filteredAudits = inventoryAudits
    .filter(
      (a) =>
        a.code.toLowerCase().includes(auditSearch.toLowerCase()) ||
        a.auditor.toLowerCase().includes(auditSearch.toLowerCase())
    )
    .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));

  const paginatedAudits = filteredAudits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-[#0B63E5]" />
            Sổ kho & Kiểm kê định kỳ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đối soát số lượng tồn hệ thống và thực tế kiểm đếm, cân bằng tồn tự động
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAuditList}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel sổ kho</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0B63E5] hover:bg-[#0952C4] active:bg-blue-800 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Tạo phiếu kiểm kê</span>
          </button>
        </div>
      </div>

      {/* Audit List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Left: Audit Ticket List */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs flex flex-col">
          <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
              Danh sách phiếu kiểm ({filteredAudits.length})
            </h3>
          </div>

          <div className="p-2.5 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Tìm mã phiếu, người kiểm..."
                className="w-full pl-7 pr-2.5 py-1 bg-slate-50 text-xs text-slate-900 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-[#0B63E5]"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
            {filteredAudits.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Chưa có phiếu kiểm kê nào</div>
            ) : (
              paginatedAudits.map((audit) => {
                const isSelected = selectedAuditDetail?.id === audit.id;
                const isBalanced = audit.status === 'BALANCED';

                return (
                  <div
                    key={audit.id}
                    onClick={() => setSelectedAuditDetail(audit)}
                    className={`p-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-2 border-[#0B63E5]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-mono text-xs font-bold text-[#0B63E5]">{audit.code}</span>
                      <span
                        className={`inline-flex items-center whitespace-nowrap text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isBalanced
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isBalanced ? 'Đã cân bằng' : 'Đang kiểm'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">{audit.auditor}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                      <span>{formatDate(audit.date)}</span>
                      <span className="font-semibold text-slate-700">
                        {audit.items.length} mặt hàng
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAudits.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 20]}
            itemLabel="phiếu"
          />
        </div>

        {/* Right: Selected Audit Detail / Balance Action View */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs flex flex-col">
          {selectedAuditDetail ? (
            <div className="flex-1 flex flex-col justify-between">
              {/* Header */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Phiếu kiểm kê {selectedAuditDetail.code}
                    </h3>
                    <span
                      className={`inline-flex items-center whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        selectedAuditDetail.status === 'BALANCED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {selectedAuditDetail.status === 'BALANCED' ? 'Đã cân bằng kho' : 'Phiếu tạm'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Người kiểm: <strong>{selectedAuditDetail.auditor}</strong> • Ngày: {formatDate(selectedAuditDetail.date)}
                  </div>
                </div>

                {/* Balance Inventory Action Button */}
                {selectedAuditDetail.status !== 'BALANCED' ? (
                  <button
                    onClick={() => balanceInventoryAudit(selectedAuditDetail.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-md shadow-2xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CÂN BẰNG KHO NGAY</span>
                  </button>
                ) : (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã cân bằng vào {selectedAuditDetail.balanced_at || selectedAuditDetail.date}</span>
                  </div>
                )}
              </div>

              {/* Items Diff Table */}
              <div className="flex-1 overflow-x-auto p-3">
                <table className="w-full text-left text-xs">
                  <thead className="table-header border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5">Tên sản phẩm</th>
                      <th className="py-2 px-2.5 text-center">Tồn hệ thống</th>
                      <th className="py-2 px-2.5 text-center">Thực tế đếm</th>
                      <th className="py-2 px-2.5 text-center">Lệch (SL)</th>
                      <th className="py-2 px-2.5 text-right">Giá trị lệch (đ)</th>
                      <th className="py-2 px-2.5">Lý do lệch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedAuditDetail.items.map((item, idx) => {
                      const isDiff = item.diff !== 0;
                      return (
                        <tr key={idx} className={isDiff ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}>
                          <td className="py-2 px-2.5">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          </td>
                          <td className="py-2 px-2.5 text-center text-slate-700 font-medium">
                            {item.system_stock} {item.unit}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-slate-900">
                            {item.actual_stock} {item.unit}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold">
                            {item.diff > 0 ? (
                              <span className="text-emerald-600 font-bold">+{item.diff} (Thừa)</span>
                            ) : item.diff < 0 ? (
                              <span className="text-rose-600 font-bold">{item.diff} (Thiếu)</span>
                            ) : (
                              <span className="text-slate-400">0 (Khớp)</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-right font-medium text-slate-700">
                            {formatCurrency(item.diff_value)}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600">
                            {item.reason || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {selectedAuditDetail.notes && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                  <strong>Ghi chú:</strong> {selectedAuditDetail.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Warehouse className="w-10 h-10 stroke-[1.5] mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Chọn phiếu kiểm kê ở danh sách bên trái</p>
              <p className="text-[10px] text-slate-400 mt-1">Hoặc bấm "+ Tạo phiếu kiểm kê" để bắt đầu đợt kiểm mới</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE AUDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-6 flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                <h3 className="text-base font-bold">Lập phiếu kiểm kê kho hàng</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-white/20 text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Meta Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Người thực hiện kiểm kê:</label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ghi chú đợt kiểm:</label>
                  <input
                    type="text"
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Ví dụ: Kiểm kho cuối tuần 4..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Items Count Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800">
                    Danh sách sản phẩm kiểm đếm ({auditItems.length}):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    * Nhập số lượng thực tế kiểm đếm, hệ thống tự tính thừa/thiếu
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Tên sản phẩm</th>
                        <th className="py-2.5 px-3 text-center">Tồn hệ thống</th>
                        <th className="py-2.5 px-3 text-center">Thực tế đếm</th>
                        <th className="py-2.5 px-3 text-center">Chênh lệch</th>
                        <th className="py-2.5 px-3">Lý do nếu lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditItems.map((item) => {
                        const diff = item.actual_stock - item.system_stock;
                        return (
                          <tr key={item.product_id} className={diff !== 0 ? 'bg-amber-50/40' : ''}>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{item.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                              {item.system_stock} {item.unit}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                value={item.actual_stock}
                                onChange={(e) =>
                                  handleItemCountChange(
                                    item.product_id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 p-1 text-center font-bold text-slate-900 border border-slate-300 rounded bg-white focus:border-blue-600 outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">
                              {diff > 0 ? (
                                <span className="text-emerald-600">+{diff} (Thừa)</span>
                              ) : diff < 0 ? (
                                <span className="text-rose-600">{diff} (Thiếu)</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {diff !== 0 ? (
                                <select
                                  value={item.reason}
                                  onChange={(e) =>
                                    handleReasonChange(item.product_id, e.target.value as any)
                                  }
                                  className="w-full p-1 bg-white border border-amber-300 rounded text-slate-800 text-[11px] outline-none"
                                >
                                  <option value="Hao hụt tự nhiên">Hao hụt tự nhiên</option>
                                  <option value="Vỡ hỏng">Vỡ hỏng</option>
                                  <option value="Mất mát / Thất thoát">Mất mát / Thất thoát</option>
                                  <option value="Sai lệch kiểm đếm">Sai lệch kiểm đếm</option>
                                  <option value="Khác">Khác</option>
                                </select>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveAudit}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                Lưu phiếu kiểm kê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
