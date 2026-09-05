import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Supplier } from '../../types';
import {
  formatCurrency,
  formatNumber,
  exportToExcel,
  downloadSupplierTemplate,
  parseExcelFile,
  parseCleanNumber,
  findHeaderValue,
} from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
import {
  Building2,
  Search,
  Plus,
  Download,
  Upload,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  TrendingDown,
  TrendingUp,
  X,
  Copy,
  Receipt,
  Briefcase
} from 'lucide-react';

export const SupplierManagementScreen: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    importSuppliers,
    addCashbookEntry,
    showToast,
    setCurrentView,
    currentUser,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'CREDIT' | 'ZERO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Drawers
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Quick Direct Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewSuppliers, setPreviewSuppliers] = useState<Partial<Supplier>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'OVERWRITE' | 'APPEND'>('APPEND');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Omit<Supplier, 'id'>>({
    code: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    ward: '',
    district_city: '',
    tax_code: '',
    id_card: '',
    group: 'Nhà phân phối tổng hợp',
    debt: 0,
    total_purchased: 0,
    note: '',
    status: 'ACTIVE',
    company: '',
    created_by: 'Admin',
    created_at: new Date().toISOString().slice(0, 10),
  });

  // Extract distinct groups for dropdown
  const distinctGroups = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.group && s.group.trim()) set.add(s.group.trim());
    });
    return Array.from(set);
  }, [suppliers]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalSuppliers = suppliers.length;
    let totalDebtPayable = 0; // Debt > 0
    let totalCreditAdvance = 0; // Debt < 0 (trả thừa/cọc)
    let totalPurchased = 0;
    let countInDebt = 0;

    suppliers.forEach((s) => {
      totalPurchased += s.total_purchased || 0;
      if (s.debt > 0) {
        totalDebtPayable += s.debt;
        countInDebt++;
      } else if (s.debt < 0) {
        totalCreditAdvance += Math.abs(s.debt);
      }
    });

    return {
      totalSuppliers,
      totalDebtPayable,
      totalCreditAdvance,
      totalPurchased,
      countInDebt,
    };
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.company && s.company.toLowerCase().includes(q)) ||
        (s.tax_code && s.tax_code.toLowerCase().includes(q));

      const matchGroup = selectedGroup === 'ALL' || s.group === selectedGroup;

      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;

      let matchDebt = true;
      if (debtFilter === 'HAS_DEBT') {
        matchDebt = s.debt > 0;
      } else if (debtFilter === 'CREDIT') {
        matchDebt = s.debt < 0;
      } else if (debtFilter === 'ZERO') {
        matchDebt = s.debt === 0;
      }

      return matchSearch && matchGroup && matchStatus && matchDebt;
    });
  }, [suppliers, searchTerm, selectedGroup, statusFilter, debtFilter]);

  const paginatedSuppliers = useMemo(() => {
    return filteredSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      code: `NCC${String(suppliers.length + 1).padStart(6, '0')}`,
      name: '',
      phone: '',
      email: '',
      address: '',
      ward: '',
      district_city: '',
      tax_code: '',
      id_card: '',
      group: 'Nhà phân phối tổng hợp',
      debt: 0,
      total_purchased: 0,
      note: '',
      status: 'ACTIVE',
      company: '',
      created_by: 'Admin',
      created_at: new Date().toISOString().slice(0, 10),
    });
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      code: sup.code,
      name: sup.name,
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      ward: sup.ward || '',
      district_city: sup.district_city || '',
      tax_code: sup.tax_code || '',
      id_card: sup.id_card || '',
      group: sup.group || 'Nhà phân phối',
      debt: sup.debt,
      total_purchased: sup.total_purchased,
      note: sup.note || '',
      status: sup.status,
      company: sup.company || '',
      created_by: sup.created_by || 'Admin',
      created_at: sup.created_at || new Date().toISOString().slice(0, 10),
    });
    setIsAddEditOpen(true);
  };

  // Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập Tên nhà cung cấp!', 'error');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, formData);
    } else {
      addSupplier(formData);
    }
    setIsAddEditOpen(false);
  };

  // Open Debt Payment Modal
  const handleOpenPayDebt = (sup: Supplier) => {
    setSelectedSupplierForPayment(sup);
    setPaymentAmount(Math.max(0, sup.debt));
    setPaymentNote(`Thanh toán nợ tiền hàng cho NCC: ${sup.name} (${sup.code})`);
    setIsPayDebtOpen(true);
  };

  // Execute Debt Payment
  const handleConfirmPayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment || paymentAmount <= 0) {
      showToast('Vui lòng nhập số tiền thanh toán hợp lệ!', 'error');
      return;
    }

    const newDebt = selectedSupplierForPayment.debt - paymentAmount;
    updateSupplier(selectedSupplierForPayment.id, { debt: newDebt });

    // Automatically record in Cashbook
    addCashbookEntry({
      type: 'OUT',
      amount: paymentAmount,
      category: 'Trả nợ Nhà Cung Cấp',
      note: paymentNote || `Chi trả tiền nợ cho ${selectedSupplierForPayment.name}`,
      ref_code: selectedSupplierForPayment.code,
    });

    showToast(`Đã lập phiếu chi trả nợ ${formatCurrency(paymentAmount)} thành công!`, 'success');
    setIsPayDebtOpen(false);
  };

  // Quick Copy text
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}: ${text}`, 'info');
  };

  // Export Suppliers to Excel
  const handleExportSuppliers = () => {
    const exportData = filteredSuppliers.map((s) => ({
      'Mã nhà cung cấp': s.code,
      'Tên nhà cung cấp': s.name,
      'Điện thoại': s.phone,
      'Email': s.email || '',
      'Địa chỉ': s.address || '',
      'Khu vực': s.district_city || '',
      'Phường / Xã': s.ward || '',
      'Mã số thuế': s.tax_code || '',
      'Số CMND / CCCD': s.id_card || '',
      'Nhóm nhà cung cấp': s.group || '',
      'Nợ cần trả (đ)': s.debt,
      'Tổng mua (đ)': s.total_purchased,
      'Tên công ty': s.company || '',
      'Ghi chú': s.note || '',
      'Trạng thái': s.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch',
      'Người tạo': s.created_by || '',
      'Ngày tạo': s.created_at || '',
    }));

    exportToExcel(exportData, `Danh_sach_nha_cung_cap_${new Date().toISOString().slice(0, 10)}`, 'NhaCungCap');
    showToast(`Đã xuất ${exportData.length} nhà cung cấp ra file Excel!`, 'success');
  };

  // Direct Excel Upload Handler for Suppliers
  const handleDirectSupplierExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportErrors([]);

    try {
      const { rows } = await parseExcelFile(file);
      if (!rows || rows.length === 0) {
        showToast('File Excel trống hoặc không tìm thấy dòng dữ liệu!', 'error');
        setIsProcessing(false);
        return;
      }

      const parsedList: Partial<Supplier>[] = [];
      const errors: string[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const rawCode = findHeaderValue(row, [
          'manhacungcap', 'mancc', 'makhncc', 'madoitac', 'manha', 'manhacc', 'code', 'suppliercode', 'ma'
        ]);
        const code = String(rawCode || '').trim() || `NCC${String(suppliers.length + idx + 1).padStart(6, '0')}`;

        const rawName = findHeaderValue(row, [
          'tennhacungcap', 'tenncc', 'tenkhncc', 'tendoitac', 'nhacungcap', 'nhaphanphoi', 'daily',
          'tennha', 'tennhacc', 'tencongty', 'congty', 'hovaten', 'ten', 'name', 'suppliername', 'doitac'
        ]);
        const name = String(rawName || '').trim();

        const rawPhone = findHeaderValue(row, ['dienthoai', 'sdt', 'sodienthoai', 'sodt', 'phone', 'tel', 'mobile', 'hotline']);
        const phone = String(rawPhone || '').trim();

        const rawEmail = findHeaderValue(row, ['email', 'thudientu', 'mail']);
        const email = String(rawEmail || '').trim();

        const rawAddress = findHeaderValue(row, ['diachi', 'diachigiaohang', 'dc', 'address', 'sonha']);
        const address = String(rawAddress || '').trim();

        const rawWard = findHeaderValue(row, ['phuongxa', 'phuong', 'xa', 'xaphuong', 'ward']);
        const ward = String(rawWard || '').trim();

        const rawDistrict = findHeaderValue(row, ['khuvuc', 'tinhthanh', 'tinhthanhpho', 'tp', 'thanhpho', 'quanhuyen', 'city', 'district', 'tinh']);
        const district_city = String(rawDistrict || '').trim();

        const rawDebt = findHeaderValue(row, ['nocantra', 'nocantrahientai', 'duno', 'nocan', 'nophaithu', 'nophatra', 'dunoncc', 'no', 'congno', 'debt']);
        const debt = parseCleanNumber(rawDebt, 0);

        const rawTotalPurchased = findHeaderValue(row, ['tongmua', 'tongtienmua', 'tonggiatrimua', 'luykemua', 'tongchitieu', 'doanhsomua', 'totalpurchased', 'mua']);
        const total_purchased = parseCleanNumber(rawTotalPurchased, 0);

        const rawTax = findHeaderValue(row, ['masothue', 'mst', 'taxcode', 'taxid']);
        const tax_code = String(rawTax || '').trim();

        const rawIdCard = findHeaderValue(row, ['socmnd', 'cmnd', 'cccd', 'socccd', 'cancuoc', 'idcard']);
        const id_card = String(rawIdCard || '').trim();

        const rawGroup = findHeaderValue(row, ['nhomnhacungcap', 'nhomncc', 'nhomdoitac', 'phanloaincc', 'nhom', 'group', 'category']);
        const group = String(rawGroup || '').trim() || 'Nhà phân phối tổng hợp';

        const rawCompany = findHeaderValue(row, ['congty', 'tencongty', 'doanhnghiep', 'company']);
        const company = String(rawCompany || '').trim() || name;

        const rawNote = findHeaderValue(row, ['ghichu', 'note', 'diengiai', 'mota', 'description']);
        const note = String(rawNote || '').trim();

        const rawCreator = findHeaderValue(row, ['nguoitao', 'nguoiphutrach', 'creator', 'createdby']);
        const created_by = String(rawCreator || '').trim() || 'Admin';

        const rawDate = findHeaderValue(row, ['ngaytao', 'thoigiantao', 'date', 'createdat']);
        const created_at = String(rawDate || '').trim() || new Date().toISOString().slice(0, 10);

        const rawStatus = findHeaderValue(row, ['trangthai', 'tinhtrang', 'status']);
        let status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
        if (rawStatus !== undefined) {
          const sStr = String(rawStatus).trim().toLowerCase();
          if (sStr === '0' || sStr === 'ngung' || sStr === 'inactive' || sStr === 'tamngung' || sStr.includes('ngung')) {
            status = 'INACTIVE';
          }
        }

        if (!name) {
          errors.push(`Dòng ${rowNum}: Tự động tạo tên "Nhà cung cấp ${code}" do ô tên bị trống`);
        }

        parsedList.push({
          code,
          name: name || `Nhà cung cấp ${code}`,
          phone,
          email,
          address,
          ward,
          district_city,
          tax_code,
          id_card,
          group,
          debt,
          total_purchased,
          note,
          status,
          company,
          created_by,
          created_at,
        });
      });

      setPreviewSuppliers(parsedList);
      setImportErrors(errors);
      setIsImportModalOpen(true);
      showToast(`Đã đọc ${parsedList.length} nhà cung cấp từ file Excel!`, 'success');
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(err);
      showToast('Lỗi đọc file: ' + (message || 'Không đúng định dạng Excel'), 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadSampleSuppliers = () => {
    const samples: Partial<Supplier>[] = [
      {
        code: 'NCC-SAMPLE-01',
        name: 'Công ty TNHH Nước giải khát Coca-Cola Việt Nam',
        phone: '1900555588',
        email: 'contact@cocacola.vn',
        address: 'KCN Sóng Thần',
        district_city: 'Bình Dương',
        tax_code: '0301444888',
        group: 'Nước giải khát',
        debt: 25000000,
        total_purchased: 120000000,
        status: 'ACTIVE',
        note: 'Giao hàng thứ 3 và thứ 6 hàng tuần',
      },
      {
        code: 'NCC-SAMPLE-02',
        name: 'Công ty Cổ phần Gia dụng Lock&Lock',
        phone: '02854135750',
        email: 'sales@locknlock.vn',
        address: '77 Hoàng Văn Thái, P. Tân Phú',
        district_city: 'Quận 7, TP.HCM',
        tax_code: '0304999111',
        group: 'Gia dụng & Tiện ích',
        debt: 0,
        total_purchased: 45000000,
        status: 'ACTIVE',
        note: 'Chiết khấu 5% khi thanh toán sớm',
      },
    ];
    setPreviewSuppliers(samples);
    setImportErrors([]);
    setIsImportModalOpen(true);
    showToast(`Đã nạp ${samples.length} nhà cung cấp mẫu vào bảng xem trước!`, 'info');
  };

  const handleConfirmDirectImport = () => {
    if (previewSuppliers.length === 0) return;
    const res = importSuppliers(previewSuppliers, importMode === 'OVERWRITE');
    setIsImportModalOpen(false);
    setPreviewSuppliers([]);
    showToast(`Đã lưu ${res.inserted + res.updated} nhà cung cấp thành công!`, 'success');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0B63E5] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Quản lý Nhà Cung Cấp & Đối Tác
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#0B63E5]">
                  {suppliers.length} đối tác
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Theo dõi danh bạ, lịch sử nhập hàng, công nợ phải trả và thông tin đối tác phân phối
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0B63E5] rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#0B63E5]" />
              <span>Nhập nhà cung cấp</span>
            </button>
          )}

          <button
            onClick={handleExportSuppliers}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={downloadSupplierTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
            <span>Tải mẫu NCC (.xlsx)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0B63E5] hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm NCC mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng số NCC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Tổng Nhà Cung Cấp</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">{formatNumber(metrics.totalSuppliers)}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{suppliers.filter(s => s.status === 'ACTIVE').length}</span>
            <span>đang giao dịch tích cực</span>
          </div>
        </div>

        {/* Card 2: Nợ Cần Trả NCC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Tổng Nợ Phải Trả NCC</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">
            {formatCurrency(metrics.totalDebtPayable)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-rose-600">{metrics.countInDebt}</span>
            <span>nhà cung cấp đang có dư nợ</span>
          </div>
        </div>

        {/* Card 3: Tiền Đã Trả Thừa / Cọc NCC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Tiền Cọc / Trả Thừa (Âm)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatCurrency(metrics.totalCreditAdvance)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Dư tiền đã thanh toán trước cho NCC</span>
          </div>
        </div>

        {/* Card 4: Tổng Tiền Hàng Đã Mua */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Tổng Giá Trị Đã Mua</span>
            <Briefcase className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {formatCurrency(metrics.totalPurchased)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Lũy kế giá trị nhập từ trước đến nay
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã, Tên, SĐT, Địa chỉ, MST..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#0B63E5] transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:border-[#0B63E5] cursor-pointer"
          >
            <option value="ALL">Tất cả nhóm NCC</option>
            {distinctGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Debt Filter */}
          <select
            value={debtFilter}
            onChange={(e) => setDebtFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:border-[#0B63E5] cursor-pointer"
          >
            <option value="ALL">Tất cả công nợ</option>
            <option value="HAS_DEBT">Đang có nợ (&gt; 0 đ)</option>
            <option value="CREDIT">Trả thừa / Đặt cọc (&lt; 0 đ)</option>
            <option value="ZERO">Không có nợ (= 0 đ)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:border-[#0B63E5] cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giao dịch</option>
            <option value="INACTIVE">Ngừng giao dịch</option>
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center whitespace-nowrap">STT</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Mã NCC</th>
                <th className="py-3 px-3.5 min-w-[160px]">Tên Nhà Cung Cấp / Công Ty</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Liên hệ</th>
                <th className="py-3 px-3.5 min-w-[160px]">Khu vực / Địa chỉ</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Nợ Cần Trả</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Tổng Mua</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Nhóm NCC</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy nhà cung cấp phù hợp</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Thử đổi bộ lọc hoặc thêm mới nhà cung cấp</p>
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-medium whitespace-nowrap">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Mã NCC */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {s.code}
                        </span>
                        <button
                          onClick={() => handleCopy(s.code, 'Mã NCC')}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-0.5"
                          title="Sao chép mã"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Tên NCC & Công ty */}
                    <td className="py-2.5 px-3.5">
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        {s.company && s.company !== s.name && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{s.company}</div>
                        )}
                        {s.tax_code && (
                          <div className="text-[10px] text-slate-400">MST: {s.tax_code}</div>
                        )}
                      </div>
                    </td>

                    {/* Liên hệ */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="space-y-0.5">
                        {s.phone ? (
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                            <a href={`tel:${s.phone}`} className="hover:underline hover:text-[#0B63E5]">
                              {s.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có SĐT</span>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[160px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <a href={`mailto:${s.email}`} className="hover:underline">
                              {s.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Địa chỉ / Khu vực */}
                    <td className="py-2.5 px-3.5 max-w-[200px]">
                      {(() => {
                        const fullAddr = [s.address, s.ward, s.district_city].filter(Boolean).join(', ');
                        return fullAddr ? (
                          <div className="flex items-center gap-1.5 min-w-0" title={fullAddr}>
                            <span className="text-slate-700 truncate max-w-[130px]">{fullAddr}</span>
                            {fullAddr.length > 16 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(fullAddr).then(() => {
                                    showToast('Đã sao chép địa chỉ NCC!', 'success');
                                  });
                                }}
                                className="text-[10px] font-bold text-[#0B63E5] hover:bg-blue-100 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded shrink-0 transition-colors cursor-pointer"
                                title="Nhấn để sao chép địa chỉ"
                              >
                                ...Xem
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        );
                      })()}
                    </td>

                    {/* Nợ Cần Trả */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      {s.debt > 0 ? (
                        <div>
                          <span className="font-bold text-rose-600 font-mono text-xs">
                            {formatCurrency(s.debt)}
                          </span>
                          <div className="text-[9px] font-semibold text-rose-500 uppercase tracking-tight">
                            Phải trả
                          </div>
                        </div>
                      ) : s.debt < 0 ? (
                        <div>
                          <span className="font-bold text-emerald-600 font-mono text-xs">
                            {formatCurrency(s.debt)}
                          </span>
                          <div className="text-[9px] font-semibold text-emerald-500 uppercase tracking-tight">
                            Trả thừa / Cọc
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono font-medium">0 đ</span>
                      )}
                    </td>

                    {/* Tổng Mua */}
                    <td className="py-2.5 px-3.5 text-right font-medium text-slate-800 font-mono whitespace-nowrap">
                      {formatCurrency(s.total_purchased || 0)}
                    </td>

                    {/* Nhóm NCC */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center whitespace-nowrap bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium shrink-0">
                        {s.group || 'Chung'}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {s.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          Giao dịch
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                          Tạm ngừng
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-blue-50/40 transition-colors z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center justify-center gap-1.5">
                        {s.debt > 0 && (
                          <button
                            onClick={() => handleOpenPayDebt(s)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Lập phiếu trả nợ NCC"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${s.name}"?`)) {
                              deleteSupplier(s.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Xóa nhà cung cấp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSuppliers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="nhà cung cấp"
        />

        {/* Footer Summary Stats */}
        <div className="p-2.5 bg-white border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-end gap-4 text-[11px]">
          <span>
            Tổng nợ phải trả: <strong className="text-rose-600 font-mono font-bold">{formatCurrency(metrics.totalDebtPayable)}</strong>
          </span>
          <span>
            Tổng tiền mua: <strong className="text-slate-800 font-mono font-bold">{formatCurrency(metrics.totalPurchased)}</strong>
          </span>
        </div>
      </div>

      {/* Drawer: Add / Edit Supplier */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B63E5] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Mới Nhà Cung Cấp'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Nhập thông tin định danh và giao dịch của đối tác</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Form */}
            <form id="supplierForm" onSubmit={handleSaveSupplier} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã Nhà Cung Cấp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: NCC000001"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5] font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  >
                    <option value="ACTIVE">Đang giao dịch</option>
                    <option value="INACTIVE">Ngừng giao dịch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên Nhà Cung Cấp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: NPP Kim Bình, Hải Anh (Tuấn)..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0904466138"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="VD: kimbinh@gmail.com"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa Chỉ Cụ Thể
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Số nhà, tên đường (VD: Ngõ 12 Quang Trung, Vinh)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phường / Xã
                  </label>
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    placeholder="VD: Phường Quang Trung"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Khu Vực / Tỉnh Thành
                  </label>
                  <input
                    type="text"
                    value={formData.district_city}
                    onChange={(e) => setFormData({ ...formData, district_city: e.target.value })}
                    placeholder="VD: Nghệ An - TP Vinh"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã Số Thuế
                  </label>
                  <input
                    type="text"
                    value={formData.tax_code}
                    onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                    placeholder="VD: 2901889922"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số CMND / CCCD
                  </label>
                  <input
                    type="text"
                    value={formData.id_card}
                    onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                    placeholder="Số thẻ CCCD"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nhóm Nhà Cung Cấp
                  </label>
                  <input
                    type="text"
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    placeholder="VD: Điện máy, Gia dụng, Mỹ phẩm..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên Công Ty (nếu có)
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Tên pháp nhân công ty"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nợ Cần Trả Hiện Tại (đ)
                  </label>
                  <input
                    type="number"
                    value={formData.debt}
                    onChange={(e) => setFormData({ ...formData, debt: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5] font-mono font-bold text-rose-600"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Nhập số âm nếu đã trả thừa/cọc trước</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tổng Mua Hàng Lũy Kế (đ)
                  </label>
                  <input
                    type="number"
                    value={formData.total_purchased}
                    onChange={(e) => setFormData({ ...formData, total_purchased: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi Chú
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Ghi chú thêm về điều khoản giao hàng, chiết khấu..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0B63E5]"
                />
              </div>
            </form>

            {/* Drawer Footer Buttons */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="supplierForm"
                className="px-4 py-1.5 font-bold text-white bg-[#0B63E5] hover:bg-blue-700 rounded-lg shadow-2xs"
              >
                {editingSupplier ? 'Lưu Thay Đổi' : 'Thêm Nhà Cung Cấp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pay Debt To Supplier */}
      {isPayDebtOpen && selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Lập Phiếu Chi Trả Nợ NCC</h3>
                  <p className="text-[11px] text-slate-500">{selectedSupplierForPayment.name} ({selectedSupplierForPayment.code})</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayDebtOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayDebt} className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-between">
                <span className="text-rose-700 font-medium">Nợ hiện tại cần thanh toán:</span>
                <span className="font-mono font-bold text-sm text-rose-700">
                  {formatCurrency(selectedSupplierForPayment.debt)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Số Tiền Chi Trả (đ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-base text-emerald-700 outline-none focus:border-emerald-500"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedSupplierForPayment.debt)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 rounded font-medium"
                  >
                    Trả toàn bộ ({formatNumber(selectedSupplierForPayment.debt)} đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.round(selectedSupplierForPayment.debt / 2))}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 rounded font-medium"
                  >
                    Trả 50%
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội Dung / Ghi Chú Phiếu Chi
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * Hệ thống sẽ tự động hạch toán vào Sổ Quỹ Tiền Mặt (Phiếu Chi).
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayDebtOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
                >
                  Xác Nhận Chi Trả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Direct Excel Import Preview with Schema Guide */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B63E5] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nhập Danh Sách Nhà Cung Cấp từ Excel (Schema Chuẩn)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tương thích file Excel KiotViet, Sapo, ERP với các cột chuẩn hóa
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setPreviewSuppliers([]);
                  setImportErrors([]);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
              {/* SCHEMA GUIDE BOX */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0B63E5]" />
                    <span className="text-xs font-bold text-blue-950">
                      Cấu trúc Cột Dữ Liệu Nhà Cung Cấp (Schema Mapping Chuẩn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadSupplierTemplate}
                      className="px-2.5 py-1 bg-white border border-blue-200 rounded-md text-[11px] font-bold text-[#0B63E5] hover:bg-blue-50 flex items-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3 h-3 text-[#0B63E5]" />
                      <span>Tải file Excel Mẫu Chuẩn</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleSuppliers}
                      className="px-2.5 py-1 bg-[#0B63E5] text-white rounded-md text-[11px] font-bold hover:bg-blue-700 flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nạp 2 NCC Mẫu</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Mã NCC (*)</div>
                    <div className="text-[10px] text-slate-500">Mã đối tác (NCC001...)</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Tên Nhà Cung Cấp (*)</div>
                    <div className="text-[10px] text-slate-500">Tên công ty / Đối tác</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Điện thoại & Email</div>
                    <div className="text-[10px] text-slate-500">Hotline liên hệ</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Địa chỉ & Tỉnh/Thành</div>
                    <div className="text-[10px] text-slate-500">Địa chỉ kho giao hàng</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Mã số thuế</div>
                    <div className="text-[10px] text-slate-500">MST xuất hóa đơn VAT</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Nợ cần trả hiện tại</div>
                    <div className="text-[10px] text-slate-500">Công nợ đầu kỳ</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Nhóm NCC</div>
                    <div className="text-[10px] text-slate-500">Phân loại nhà phân phối</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Ghi chú & Trạng thái</div>
                    <div className="text-[10px] text-slate-500">Đang giao dịch / Ngừng</div>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20 rounded-xl p-5 text-center transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleDirectSupplierExcel}
                  className="hidden"
                  id="supplier-excel-file-modal-inner"
                />
                <label
                  htmlFor="supplier-excel-file-modal-inner"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0B63E5] flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Kéo thả file Excel Nhà Cung Cấp vào đây hoặc <span className="text-[#0B63E5]">chọn file</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hỗ trợ .xlsx, .xls, .csv (Tự động map tên cột thông minh)
                  </div>
                </label>
              </div>

              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lưu ý khi đọc file:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {importErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importErrors.length > 5 && <li>...và {importErrors.length - 5} dòng khác đã được tự động xử lý.</li>}
                  </ul>
                </div>
              )}

              {/* Live Preview Table */}
              {previewSuppliers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Bảng Xem Trước ({previewSuppliers.length} nhà cung cấp)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setPreviewSuppliers([])}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Xóa bảng xem trước
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Mã NCC</th>
                          <th className="py-2 px-3">Tên Nhà Cung Cấp</th>
                          <th className="py-2 px-3">Điện thoại</th>
                          <th className="py-2 px-3">Địa chỉ / Khu vực</th>
                          <th className="py-2 px-3 text-right">Nợ Cần Trả</th>
                          <th className="py-2 px-3 text-right">Tổng Mua</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewSuppliers.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#0B63E5]">{s.code}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{s.name}</td>
                            <td className="py-2 px-3 text-slate-600">{s.phone || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{s.address ? `${s.address}, ` : ''}{s.district_city || '—'}</td>
                            <td className={`py-2 px-3 text-right font-semibold ${s.debt && s.debt > 0 ? 'text-rose-600' : s.debt && s.debt < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {formatCurrency(s.debt || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-700">
                              {formatCurrency(s.total_purchased || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Chế độ:</span>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none font-semibold text-slate-700"
                >
                  <option value="APPEND">Thêm mới & Cập nhật</option>
                  <option value="OVERWRITE">Ghi đè hoàn toàn</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 font-semibold text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={previewSuppliers.length === 0}
                  onClick={handleConfirmDirectImport}
                  className={`px-4 py-1.5 font-bold text-xs text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-all ${
                    previewSuppliers.length > 0
                      ? 'bg-[#0B63E5] hover:bg-blue-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác Nhận Lưu ({previewSuppliers.length} NCC)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
