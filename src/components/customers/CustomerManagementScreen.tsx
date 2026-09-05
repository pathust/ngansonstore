import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import {
  formatCurrency,
  exportToExcel,
  downloadCustomerTemplate,
  parseExcelFile,
  parseCleanNumber,
  findHeaderValue,
  formatDateTime,
} from '../../utils/formatters';
import { Pagination } from '../common/Pagination';
import { useCustomerFilters } from './useCustomerFilters';
import {
  Users,
  Search,
  Plus,
  Download,
  Upload,
  Edit2,
  Trash2,
  Phone,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  TrendingDown,
  TrendingUp,
  X,
  Copy,
  RefreshCw,
  Sparkles,
  Building,
  User as UserIcon,
  DollarSign,
  MapPin,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  Check,
} from 'lucide-react';

export const CustomerManagementScreen: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    importCustomers,
    addCashbookEntry,
    showToast,
    currentUser,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'Cá nhân' | 'Công ty'>('ALL');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'CREDIT' | 'ZERO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Debt collection modal
  const [isCollectDebtOpen, setIsCollectDebtOpen] = useState(false);
  const [selectedCustomerForDebt, setSelectedCustomerForDebt] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('CASH');
  const [collectNote, setCollectNote] = useState<string>('');

  // Customer Detail Drawer
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Table Density & Column Visibility
  const [tableDensity, setTableDensity] = useState<'COMFORTABLE' | 'COMPACT'>(() => {
    return (localStorage.getItem('customer_table_density') as 'COMFORTABLE' | 'COMPACT') || 'COMFORTABLE';
  });
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const DEFAULT_COLUMNS: Record<string, boolean> = {
    code: true,
    name: true,
    customer_type: true,
    phone: true,
    address: true,
    group: true,
    debt: true,
    total_purchased: true,
    status: true,
    actions: true,
  };
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('customer_table_columns');
      if (saved) return { ...DEFAULT_COLUMNS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_COLUMNS;
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('customer_table_columns', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    try {
      localStorage.setItem('customer_table_columns', JSON.stringify(DEFAULT_COLUMNS));
    } catch {}
  };

  const handleDensityChange = (density: 'COMFORTABLE' | 'COMPACT') => {
    setTableDensity(density);
    try {
      localStorage.setItem('customer_table_density', density);
    } catch {}
  };

  // Quick Address Preview Modal
  const [addressDetailModal, setAddressDetailModal] = useState<{
    customer: Customer;
    fullAddress: string;
  } | null>(null);

  // Dedicated Excel Import Modal with Schema
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewCustomers, setPreviewCustomers] = useState<Partial<Customer>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'OVERWRITE' | 'APPEND'>('APPEND');
  const [isProcessing, setIsProcessing] = useState(false);


  // Form State
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>({
    code: '',
    name: '',
    phone: '',
    customer_type: 'Cá nhân',
    type: 'Cá nhân',
    email: '',
    address: '',
    ward: '',
    district_city: '',
    gender: 'Nam',
    tax_code: '',
    id_card: '',
    group: 'Khách lẻ',
    debt: 0,
    total_purchased: 0,
    note: '',
    status: 'ACTIVE',
    branch: 'Cửa hàng Ngân Sơn',
    created_by: currentUser.name,
    created_at: new Date().toISOString().slice(0, 10),
  });

  const { distinctGroups, metrics, filteredCustomers, paginatedCustomers } = useCustomerFilters({
    customers,
    searchTerm,
    selectedGroup,
    selectedType,
    statusFilter,
    debtFilter,
    currentPage,
    pageSize,
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      code: `KH${String(customers.length + 1).padStart(7, '0')}`,
      name: '',
      phone: '',
      customer_type: 'Cá nhân',
      type: 'Cá nhân',
      email: '',
      address: '',
      ward: '',
      district_city: '',
      gender: 'Nam',
      tax_code: '',
      id_card: '',
      group: 'Khách lẻ',
      debt: 0,
      total_purchased: 0,
      note: '',
      status: 'ACTIVE',
      branch: 'Cửa hàng Ngân Sơn',
      created_by: currentUser.name,
      created_at: new Date().toISOString().slice(0, 10),
    });
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    const typeVal = cust.customer_type || cust.type || 'Cá nhân';
    setFormData({
      code: cust.code,
      name: cust.name,
      phone: cust.phone || '',
      customer_type: typeVal,
      type: typeVal,
      email: cust.email || '',
      address: cust.address || '',
      ward: cust.ward || '',
      district_city: cust.district_city || '',
      gender: cust.gender || 'Nam',
      tax_code: cust.tax_code || '',
      id_card: cust.id_card || '',
      group: cust.group || 'Khách lẻ',
      debt: cust.debt,
      total_purchased: cust.total_purchased,
      note: cust.note || '',
      status: (cust.status === 1 || cust.status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE',
      branch: cust.branch || 'Cửa hàng Ngân Sơn',
      created_by: cust.created_by || currentUser.name,
      created_at: cust.created_at || new Date().toISOString().slice(0, 10),
    });
    setIsAddEditOpen(true);
  };

  // Save Customer
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập Tên khách hàng!', 'error');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
      showToast(`Đã cập nhật khách hàng "${formData.name}" thành công!`, 'success');
    } else {
      addCustomer(formData);
      showToast(`Đã thêm mới khách hàng "${formData.name}" thành công!`, 'success');
    }
    setIsAddEditOpen(false);
  };

  // Open Debt Collection Modal
  const handleOpenCollectDebt = (cust: Customer) => {
    setSelectedCustomerForDebt(cust);
    setCollectAmount(Math.max(0, cust.debt));
    setPaymentMethod('CASH');
    setCollectNote(`Thu tiền nợ khách hàng: ${cust.name} (${cust.code})`);
    setIsCollectDebtOpen(true);
  };

  // Confirm Debt Collection (Phiếu Thu Tiền Nợ)
  const handleConfirmCollectDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForDebt || collectAmount <= 0) {
      showToast('Vui lòng nhập số tiền thu nợ hợp lệ!', 'error');
      return;
    }

    const newDebt = selectedCustomerForDebt.debt - collectAmount;
    updateCustomer(selectedCustomerForDebt.id, { debt: newDebt });

    // Record into Cashbook as IN (Phiếu Thu)
    addCashbookEntry({
      type: 'IN',
      amount: collectAmount,
      category: 'Thu nợ Khách Hàng',
      note: collectNote || `Thu tiền nợ từ ${selectedCustomerForDebt.name} (${selectedCustomerForDebt.code})`,
      ref_code: selectedCustomerForDebt.code,
    });

    showToast(`Đã lập Phiếu Thu ${formatCurrency(collectAmount)} từ khách hàng ${selectedCustomerForDebt.name}!`, 'success');
    setIsCollectDebtOpen(false);
  };

  // Quick Copy text
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}: ${text}`, 'info');
  };

  // Export Customers to Excel
  const handleExportCustomers = () => {
    const exportData = filteredCustomers.map((c) => ({
      'Mã khách hàng': c.code,
      'Tên khách hàng': c.name,
      'Loại khách': c.customer_type || c.type || 'Cá nhân',
      'Điện thoại': c.phone,
      'Email': c.email || '',
      'Địa chỉ': c.address || '',
      'Khu vực': c.district_city || '',
      'Phường / Xã': c.ward || '',
      'Giới tính': c.gender || '',
      'Mã số thuế': c.tax_code || '',
      'Số CMND / CCCD': c.id_card || '',
      'Nhóm khách hàng': c.group || '',
      'Nợ hiện tại (đ)': c.debt,
      'Tổng mua (đ)': c.total_purchased,
      'Ghi chú': c.note || '',
      'Trạng thái': (c.status === 1 || c.status === 'ACTIVE') ? 'Đang hoạt động' : 'Ngừng hoạt động',
      'Chi nhánh': c.branch || '',
      'Người tạo': c.created_by || '',
      'Ngày tạo': c.created_at || '',
    }));

    exportToExcel(exportData, `Danh_sach_khach_hang_${new Date().toISOString().slice(0, 10)}`, 'KhachHang');
    showToast(`Đã xuất ${exportData.length} khách hàng ra file Excel!`, 'success');
  };

  // Parse Excel File in Modal
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const parsedList: Partial<Customer>[] = [];
      const errors: string[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const rawCode = findHeaderValue(row, [
          'makhachhang', 'makhach', 'makh', 'madoitac', 'code', 'customercode', 'ma'
        ]);
        const code = String(rawCode || '').trim() || `KH${String(customers.length + idx + 1).padStart(7, '0')}`;

        const rawName = findHeaderValue(row, [
          'tenkhachhang', 'tenkhach', 'tenkh', 'tendoitac', 'hovaten', 'hoten', 'ten', 'name', 'customername', 'doitac'
        ]);
        const name = String(rawName || '').trim();

        if (!name) {
          errors.push(`Dòng ${rowNum}: Bỏ qua do thiếu Tên khách hàng`);
          return;
        }

        const rawPhone = findHeaderValue(row, ['dienthoai', 'sdt', 'sodienthoai', 'sodt', 'phone', 'tel', 'mobile']);
        const phone = String(rawPhone || '').trim();

        const rawEmail = findHeaderValue(row, ['email', 'thudientu', 'mail']);
        const email = String(rawEmail || '').trim();

        const rawAddress = findHeaderValue(row, ['diachi', 'address', 'diachithuongtru', 'diachinhan']);
        const address = String(rawAddress || '').trim();

        const rawWard = findHeaderValue(row, ['phuongxa', 'phuong', 'xa', 'ward']);
        const ward = String(rawWard || '').trim();

        const rawDistrictCity = findHeaderValue(row, ['khuvuc', 'khuvucthanhpho', 'quanhuyen', 'tinhthanh', 'district_city', 'city']);
        const district_city = String(rawDistrictCity || '').trim();

        const rawGender = findHeaderValue(row, ['gioitinh', 'gender', 'phai']);
        const gender = String(rawGender || '').trim();

        const rawTaxCode = findHeaderValue(row, ['masothue', 'mst', 'taxcode', 'tax_code']);
        const tax_code = String(rawTaxCode || '').trim();

        const rawIdCard = findHeaderValue(row, ['socmnd', 'cmnd', 'cccd', 'idcard', 'id_card', 'cancuoc']);
        const id_card = String(rawIdCard || '').trim();

        const rawDebt = findHeaderValue(row, ['nohientai', 'duno', 'nocanthu', 'congno', 'debt']);
        const debt = parseCleanNumber(rawDebt, 0);

        const rawTotalPurchased = findHeaderValue(row, ['tongmua', 'tongtienmua', 'totalpurchased', 'total_purchased', 'doanhsomua']);
        const totalPurchased = parseCleanNumber(rawTotalPurchased, 0);

        const rawGroup = findHeaderValue(row, ['nhomkhachhang', 'nhomkhach', 'nhomkh', 'nhom', 'group', 'customergroup']);
        const group = String(rawGroup || '').trim() || 'Khách lẻ';

        const rawCustomerType = findHeaderValue(row, ['loaikhach', 'loaikhachhang', 'customertype', 'loai']);
        const customer_type = String(rawCustomerType || '').trim() || 'Cá nhân';

        const rawNote = findHeaderValue(row, ['ghichu', 'note', 'ghichukhachhang']);
        const note = String(rawNote || '').trim();

        const rawBranch = findHeaderValue(row, ['chinhanh', 'chinhanhtaokhach', 'branch']);
        const branch = String(rawBranch || '').trim() || 'Cửa hàng Ngân Sơn';

        const rawCreatedBy = findHeaderValue(row, ['nguoitao', 'nhanvienphutrach', 'createdby', 'created_by']);
        const created_by = String(rawCreatedBy || '').trim() || currentUser.name;

        const rawCreatedAt = findHeaderValue(row, ['ngaytao', 'createdat', 'created_at', 'thoigiantao']);
        const created_at = rawCreatedAt ? formatDateTime(rawCreatedAt).slice(0, 10) : new Date().toISOString().slice(0, 10);

        parsedList.push({
          code,
          name,
          phone,
          email,
          address,
          ward,
          district_city,
          gender,
          tax_code,
          id_card,
          group,
          customer_type,
          type: customer_type,
          debt,
          total_purchased: totalPurchased,
          note,
          status: 'ACTIVE',
          branch,
          created_by,
          created_at,
        });
      });

      setPreviewCustomers(parsedList);
      setImportErrors(errors);
      showToast(`Đã đọc ${parsedList.length} khách hàng từ file!`, 'success');
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Lỗi khi đọc file Excel: ${message}`, 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load sample dataset for testing
  const handleLoadSampleDataset = () => {
    const sampleCusts: Partial<Customer>[] = [
      {
        code: 'KH0000001',
        name: 'Nguyễn Văn Hùng',
        phone: '0912345678',
        email: 'hung.nguyen@gmail.com',
        address: '128 Đường Cầu Giấy',
        ward: 'Quan Hoa',
        district_city: 'Hà Nội - Quận Cầu Giấy',
        gender: 'Nam',
        group: 'Khách VIP',
        customer_type: 'Cá nhân',
        debt: 0,
        total_purchased: 4500000,
        note: 'Khách hàng thân thiết',
        status: 'ACTIVE',
        branch: 'Cửa hàng Ngân Sơn',
        created_by: currentUser.name,
        created_at: '2026-01-15',
      },
      {
        code: 'KH0000002',
        name: 'Trần Thị Mai Lan',
        phone: '0988776655',
        email: 'lan.tran@yahoo.com',
        address: '45 Lê Văn Lương',
        ward: 'Nhân Chính',
        district_city: 'Hà Nội - Quận Thanh Xuân',
        gender: 'Nữ',
        group: 'Khách lẻ',
        customer_type: 'Cá nhân',
        debt: 120000,
        total_purchased: 1850000,
        note: 'Hay mua đồ gia dụng',
        status: 'ACTIVE',
        branch: 'Cửa hàng Ngân Sơn',
        created_by: currentUser.name,
        created_at: '2026-02-10',
      },
      {
        code: 'KH0000003',
        name: 'Công ty TNHH Giải Pháp Công Nghệ Á Châu',
        phone: '02438889999',
        email: 'contact@asiatech.vn',
        address: 'Tầng 8, Tòa nhà Keangnam, Phạm Hùng',
        ward: 'Mễ Trì',
        district_city: 'Hà Nội - Quận Nam Từ Liêm',
        gender: '',
        tax_code: '0108999888',
        group: 'Doanh nghiệp',
        customer_type: 'Công ty',
        debt: 5000000,
        total_purchased: 35000000,
        note: 'Hợp đồng cung cấp thiết bị định kỳ',
        status: 'ACTIVE',
        branch: 'Cửa hàng Ngân Sơn',
        created_by: currentUser.name,
        created_at: '2026-03-01',
      },
    ];

    setPreviewCustomers(sampleCusts);
    setImportErrors([]);
    showToast(`Đã nạp ${sampleCusts.length} khách hàng mẫu vào bảng xem trước!`, 'info');
  };

  // Confirm Import Customers
  const handleConfirmImport = () => {
    if (previewCustomers.length === 0) return;
    const res = importCustomers(previewCustomers, importMode === 'OVERWRITE');
    showToast(`Đã lưu thành công ${res.inserted + res.updated} khách hàng vào hệ thống!`, 'success');
    setIsImportModalOpen(false);
    setPreviewCustomers([]);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Quản lý Khách Hàng & Công Nợ</span>
              <span className="badge-purple text-xs font-bold px-2 py-0.5 rounded-full">
                {customers.length} khách
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý hồ sơ khách hàng, phân loại đối tác, công nợ phải thu và nhập dữ liệu trực tiếp với schema chuẩn.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0B63E5] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Upload className="w-4 h-4 text-[#0B63E5]" />
              <span>Nhập khách hàng</span>
            </button>
          )}

          <button
            onClick={handleExportCustomers}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-[#0B63E5] hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng khách hàng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0B63E5] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {metrics.totalCustomers.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Hồ sơ khách hàng lưu trữ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Tổng nợ phải thu</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-700 mt-2">
            {formatCurrency(metrics.totalDebtReceivable)}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            {metrics.countInDebt} khách hàng đang có nợ
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Khách trả trước / Dư</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 mt-2">
            {formatCurrency(metrics.totalCreditAdvance)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Số dư đặt cọc & trả thừa</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Doanh số mua tích lũy</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 mt-2">
            {formatCurrency(metrics.totalPurchased)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tổng tiền khách đã mua sắm</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo Tên KH, Mã KH, SĐT, Địa chỉ, Email, MST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Group Filter */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-[#0B63E5]"
            >
              <option value="ALL">Tất cả nhóm khách</option>
              {distinctGroups.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
            </select>

            {/* Type Filter (Cá nhân / Công ty) */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-[#0B63E5]"
            >
              <option value="ALL">Tất cả loại khách</option>
              <option value="Cá nhân">Cá nhân</option>
              <option value="Công ty">Công ty / Doanh nghiệp</option>
            </select>

            {/* Debt Filter */}
            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-[#0B63E5]"
            >
              <option value="ALL">Tất cả trạng thái nợ</option>
              <option value="HAS_DEBT">Đang có nợ (&gt; 0đ)</option>
              <option value="ZERO">Không nợ (0đ)</option>
              <option value="CREDIT">Trả trước / Đặt cọc (&lt; 0đ)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-[#0B63E5]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Hiển thị <strong className="text-slate-800">{filteredCustomers.length}</strong> / {customers.length} khách hàng
            </span>
            {(searchTerm || selectedGroup !== 'ALL' || selectedType !== 'ALL' || debtFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedGroup('ALL');
                  setSelectedType('ALL');
                  setDebtFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="text-[#0B63E5] hover:underline font-medium text-xs cursor-pointer flex items-center gap-1 ml-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Table Density Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleDensityChange('COMFORTABLE')}
                className={`px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  tableDensity === 'COMFORTABLE'
                    ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Khoảng cách dòng tiêu chuẩn"
              >
                Tiêu chuẩn
              </button>
              <button
                type="button"
                onClick={() => handleDensityChange('COMPACT')}
                className={`px-2 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  tableDensity === 'COMPACT'
                    ? 'bg-white text-[#0B63E5] shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Khoảng cách dòng gọn gàng, xem được nhiều hơn"
              >
                Gọn gàng
              </button>
            </div>

            {/* Column Toggler */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isColumnConfigOpen
                    ? 'bg-blue-50 text-[#0B63E5] border-blue-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Tùy chỉnh các cột hiển thị trong bảng"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Cột hiển thị</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isColumnConfigOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsColumnConfigOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 space-y-1 animate-in fade-in duration-100 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1 px-1">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Chọn cột hiển thị</span>
                      <button
                        type="button"
                        onClick={resetColumns}
                        className="text-[10px] text-[#0B63E5] hover:underline cursor-pointer"
                      >
                        Mặc định
                      </button>
                    </div>
                    {[
                      { key: 'code', label: 'Mã KH' },
                      { key: 'name', label: 'Tên Khách Hàng', disabled: true },
                      { key: 'customer_type', label: 'Loại Khách' },
                      { key: 'phone', label: 'Điện Thoại' },
                      { key: 'address', label: 'Địa Chỉ / Khu Vực' },
                      { key: 'group', label: 'Nhóm Khách' },
                      { key: 'debt', label: 'Nợ Hiện Tại' },
                      { key: 'total_purchased', label: 'Tổng Mua' },
                      { key: 'status', label: 'Trạng Thái' },
                      { key: 'actions', label: 'Thao Tác', disabled: true },
                    ].map((col) => (
                      <label
                        key={col.key}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer ${
                          col.disabled ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="text-slate-700">{col.label}</span>
                        <input
                          type="checkbox"
                          disabled={col.disabled}
                          checked={visibleColumns[col.key] !== false}
                          onChange={() => !col.disabled && toggleColumn(col.key)}
                          className="rounded text-[#0B63E5] focus:ring-0 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] sticky top-0 z-10">
              <tr>
                {visibleColumns.code !== false && (
                  <th className="py-2.5 px-3 whitespace-nowrap">Mã KH</th>
                )}
                {visibleColumns.name !== false && (
                  <th className="py-2.5 px-3 min-w-[140px]">Tên Khách Hàng</th>
                )}
                {visibleColumns.customer_type !== false && (
                  <th className="py-2.5 px-3 whitespace-nowrap">Loại Khách</th>
                )}
                {visibleColumns.phone !== false && (
                  <th className="py-2.5 px-3 whitespace-nowrap">Điện Thoại</th>
                )}
                {visibleColumns.address !== false && (
                  <th className="py-2.5 px-3 min-w-[150px] max-w-[220px]">Địa Chỉ / Khu Vực</th>
                )}
                {visibleColumns.group !== false && (
                  <th className="py-2.5 px-3 whitespace-nowrap">Nhóm Khách</th>
                )}
                {visibleColumns.debt !== false && (
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Nợ Hiện Tại</th>
                )}
                {visibleColumns.total_purchased !== false && (
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Tổng Mua</th>
                )}
                {visibleColumns.status !== false && (
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Trạng Thái</th>
                )}
                {visibleColumns.actions !== false && (
                  <th className="py-2.5 px-3 text-center whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]">
                    Thao Tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-600">Không tìm thấy khách hàng nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử điều chỉnh từ khóa tìm kiếm hoặc nhấn nút "Nhập Excel (Schema)" để thêm danh sách khách hàng.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const custType = c.customer_type || c.type || 'Cá nhân';
                  const isActive = c.status === 1 || c.status === 'ACTIVE';
                  const fullAddress = [c.address, c.ward, c.district_city].filter(Boolean).join(', ');
                  const rowPadding = tableDensity === 'COMPACT' ? 'py-1.5 px-2.5' : 'py-2.5 px-3';

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setDetailCustomer(c)}
                    >
                      {/* Mã KH */}
                      {visibleColumns.code !== false && (
                        <td className={`${rowPadding} font-bold text-[#0B63E5] whitespace-nowrap`}>
                          <div className="flex items-center gap-1.5">
                            <span>{c.code}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(c.code, 'Mã KH');
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-opacity cursor-pointer"
                              title="Sao chép mã"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Tên KH */}
                      {visibleColumns.name !== false && (
                        <td className={`${rowPadding} font-semibold text-slate-900 whitespace-nowrap`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{c.name}</span>
                            {custType === 'Công ty' && visibleColumns.customer_type === false && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                Công ty
                              </span>
                            )}
                          </div>
                          {c.email && <div className="text-[10px] text-slate-400 font-normal">{c.email}</div>}
                        </td>
                      )}

                      {/* Loại Khách */}
                      {visibleColumns.customer_type !== false && (
                        <td className={`${rowPadding} whitespace-nowrap`}>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                              custType === 'Công ty'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {custType === 'Công ty' ? <Building className="w-2.5 h-2.5" /> : <UserIcon className="w-2.5 h-2.5" />}
                            <span>{custType}</span>
                          </span>
                        </td>
                      )}

                      {/* Điện Thoại */}
                      {visibleColumns.phone !== false && (
                        <td className={`${rowPadding} font-medium text-slate-700 whitespace-nowrap`}>
                          {c.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{c.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Địa Chỉ / Khu Vực: Gọn gàng 1 dòng + ...Xem */}
                      {visibleColumns.address !== false && (
                        <td className={`${rowPadding} text-slate-600 max-w-[220px]`}>
                          {fullAddress ? (
                            <div className="flex items-center gap-1.5 min-w-0" title={fullAddress}>
                              <span className="text-slate-700 truncate max-w-[140px]">{fullAddress}</span>
                              {fullAddress.length > 16 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddressDetailModal({ customer: c, fullAddress });
                                  }}
                                  className="text-[10px] font-bold text-[#0B63E5] hover:bg-blue-100 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded shrink-0 transition-colors cursor-pointer"
                                  title="Nhấn để xem địa chỉ đầy đủ"
                                >
                                  ...Xem
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {/* Nhóm Khách */}
                      {visibleColumns.group !== false && (
                        <td className={`${rowPadding} whitespace-nowrap`}>
                          <span className="inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium shrink-0">
                            {c.group || 'Khách lẻ'}
                          </span>
                        </td>
                      )}

                      {/* Nợ Hiện Tại */}
                      {visibleColumns.debt !== false && (
                        <td className={`${rowPadding} text-right font-mono whitespace-nowrap`}>
                          {c.debt > 0 ? (
                            <span className="inline-flex items-center whitespace-nowrap font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                              {formatCurrency(c.debt)}
                            </span>
                          ) : c.debt < 0 ? (
                            <span className="inline-flex items-center whitespace-nowrap font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                              +{formatCurrency(Math.abs(c.debt))}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">0đ</span>
                          )}
                        </td>
                      )}

                      {/* Tổng Mua */}
                      {visibleColumns.total_purchased !== false && (
                        <td className={`${rowPadding} text-right font-mono font-bold text-slate-800 whitespace-nowrap`}>
                          {formatCurrency(c.total_purchased || 0)}
                        </td>
                      )}

                      {/* Trạng Thái */}
                      {visibleColumns.status !== false && (
                        <td className={`${rowPadding} text-center whitespace-nowrap`}>
                          <span
                            className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {isActive ? 'Hoạt động' : 'Ngừng'}
                          </span>
                        </td>
                      )}

                      {/* Thao Tác (Sticky Right Column: Never Cut Off!) */}
                      {visibleColumns.actions !== false && (
                        <td className={`${rowPadding} text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.08)]`}>
                          <div
                            className="flex items-center justify-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {c.debt > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenCollectDebt(c)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Lập phiếu thu nợ"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#0B63E5] transition-colors cursor-pointer"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa khách hàng "${c.name}"?`)) {
                                  deleteCustomer(c.id);
                                  showToast(`Đã xóa khách hàng "${c.name}"!`, 'info');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa khách hàng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
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
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="khách hàng"
        />
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      {/* ========================================================================= */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {editingCustomer ? 'Chỉnh Sửa Hồ Sơ Khách Hàng' : 'Thêm Khách Hàng Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Điền thông tin định danh và công nợ đối tác khách hàng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Type selector */}
              <div className="flex items-center gap-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Loại khách hàng:</span>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="custType"
                    checked={formData.customer_type === 'Cá nhân'}
                    onChange={() => setFormData({ ...formData, customer_type: 'Cá nhân', type: 'Cá nhân' })}
                    className="text-[#0B63E5] focus:ring-blue-500"
                  />
                  <span>Cá nhân</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-800 cursor-pointer ml-3">
                  <input
                    type="radio"
                    name="custType"
                    checked={formData.customer_type === 'Công ty'}
                    onChange={() => setFormData({ ...formData, customer_type: 'Công ty', type: 'Công ty' })}
                    className="text-[#0B63E5] focus:ring-blue-500"
                  />
                  <span>Công ty / Doanh nghiệp</span>
                </label>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã khách hàng</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-[#0B63E5] outline-none"
                    placeholder="KH0000001"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tên khách hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="Nhập tên khách hàng..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="0912..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="khachhang@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nhóm khách hàng</label>
                  <input
                    type="text"
                    value={formData.group}
                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="Khách lẻ, VIP, Đại lý..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã số thuế</label>
                  <input
                    type="text"
                    value={formData.tax_code}
                    onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="MST doanh nghiệp hoặc cá nhân"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Số CMND / CCCD</label>
                  <input
                    type="text"
                    value={formData.id_card}
                    onChange={(e) => setFormData({ ...formData, id_card: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="Số thẻ căn cước"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="Số nhà, tên đường..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phường / Xã</label>
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="Phường / Xã..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Khu vực / Tỉnh Thành</label>
                  <input
                    type="text"
                    value={formData.district_city}
                    onChange={(e) => setFormData({ ...formData, district_city: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none"
                    placeholder="Hà Nội - Cầu Giấy..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nợ hiện tại (đ)</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={formData.debt}
                    onChange={(e) => setFormData({ ...formData, debt: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-rose-600 focus:border-[#0B63E5] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tổng mua tích lũy (đ)</label>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    value={formData.total_purchased}
                    onChange={(e) => setFormData({ ...formData, total_purchased: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-600 focus:border-[#0B63E5] outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ghi chú</label>
                  <textarea
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-[#0B63E5] outline-none resize-none"
                    placeholder="Ghi chú thêm về khách hàng..."
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#0B63E5] hover:bg-blue-700 text-white text-xs font-bold shadow-2xs"
                >
                  {editingCustomer ? 'Lưu Thay Đổi' : 'Tạo Khách Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THU NỢ KHÁCH HÀNG (PHIẾU THU) */}
      {/* ========================================================================= */}
      {isCollectDebtOpen && selectedCustomerForDebt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 bg-emerald-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Thu Tiền Nợ Khách Hàng</h3>
                  <p className="text-[11px] text-slate-500">Tạo phiếu thu & tự động trừ nợ công nợ</p>
                </div>
              </div>
              <button
                onClick={() => setIsCollectDebtOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCollectDebt} className="p-4 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng:</span>
                  <span className="font-bold text-slate-900">{selectedCustomerForDebt.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã khách hàng:</span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedCustomerForDebt.code}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Nợ hiện tại:</span>
                  <span className="font-bold text-rose-600 font-mono text-sm">
                    {formatCurrency(selectedCustomerForDebt.debt)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Số tiền thu (đ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  required
                  min={1000}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-base font-bold font-mono text-emerald-600 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Hình thức thanh toán</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Chuyển khoản
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                      paymentMethod === 'CARD'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Thẻ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ghi chú phiếu thu</label>
                <input
                  type="text"
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-[#0B63E5] outline-none"
                  placeholder="Ghi chú thêm..."
                />
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex justify-between items-center text-xs">
                <span className="text-slate-600">Nợ còn lại sau khi thu:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCurrency(Math.max(0, selectedCustomerForDebt.debt - collectAmount))}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCollectDebtOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs"
                >
                  Xác Nhận Thu Tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DIRECT EXCEL IMPORT MODAL WITH CLEAR SCHEMA GUIDE */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nhập Danh Sách Khách Hàng từ Excel (Schema Chuẩn)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ file Excel từ KiotViet, ERP, POS hoặc tải mẫu chuẩn bên dưới
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setPreviewCustomers([]);
                  setImportErrors([]);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* SCHEMA GUIDE ACCORDION / BOX */}
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-950">
                      Cấu trúc Cột Dữ Liệu Hỗ Trợ (Schema Mapping)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadCustomerTemplate}
                      className="px-2.5 py-1 bg-white border border-purple-200 rounded-md text-[11px] font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3 h-3 text-purple-600" />
                      <span>Tải file Excel Mẫu Chuẩn</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleDataset}
                      className="px-2.5 py-1 bg-purple-600 text-white rounded-md text-[11px] font-bold hover:bg-purple-700 flex items-center gap-1 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Nạp 3 Khách Hàng Mẫu</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Tên khách hàng (*)</div>
                    <div className="text-[10px] text-slate-500">Bắt buộc, chuỗi ký tự</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Mã khách hàng</div>
                    <div className="text-[10px] text-slate-500">Tùy chọn (tự tạo: KH000...)</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Điện thoại / SDT</div>
                    <div className="text-[10px] text-slate-500">Số liên hệ, dùng nhận diện</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Loại khách</div>
                    <div className="text-[10px] text-slate-500">Cá nhân / Công ty</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Địa chỉ & Khu vực</div>
                    <div className="text-[10px] text-slate-500">Số nhà, Phường/Xã, Tỉnh/TP</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Mã số thuế / CMND</div>
                    <div className="text-[10px] text-slate-500">Định danh doanh nghiệp/cá nhân</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Nợ hiện tại (đ)</div>
                    <div className="text-[10px] text-slate-500">Công nợ ban đầu (số)</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-purple-100">
                    <div className="font-bold text-slate-800">Nhóm khách hàng</div>
                    <div className="text-[10px] text-slate-500">Khách lẻ, VIP, Đại lý...</div>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50/60 hover:bg-purple-50/20 rounded-xl p-5 text-center transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="customer-excel-file-modal"
                />
                <label
                  htmlFor="customer-excel-file-modal"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Kéo thả file Excel vào đây hoặc <span className="text-[#0B63E5]">chọn file</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Định dạng hỗ trợ: .xlsx, .xls, .csv (Tự động nhận diện tiêu đề cột)
                  </div>
                </label>
              </div>

              {/* Error messages */}
              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Lưu ý khi đọc file:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {importErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live Preview Table */}
              {previewCustomers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">
                        Xem trước ({previewCustomers.length} khách hàng hợp lệ)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewCustomers([])}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Xóa bảng xem trước
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Mã KH</th>
                          <th className="py-2 px-3">Tên Khách Hàng</th>
                          <th className="py-2 px-3">Loại</th>
                          <th className="py-2 px-3">Điện Thoại</th>
                          <th className="py-2 px-3">Địa Chỉ / Khu Vực</th>
                          <th className="py-2 px-3">Nhóm KH</th>
                          <th className="py-2 px-3 text-right">Nợ Hiện Tại</th>
                          <th className="py-2 px-3 text-right">Tổng Mua</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewCustomers.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#0B63E5]">{c.code}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{c.name}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                                {c.customer_type || 'Cá nhân'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-700">{c.phone || '—'}</td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{c.address || c.district_city || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{c.group || 'Khách lẻ'}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(c.debt || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(c.total_purchased || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 font-medium">Khi trùng mã/SĐT:</span>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="modalCustMode"
                    checked={importMode === 'OVERWRITE'}
                    onChange={() => setImportMode('OVERWRITE')}
                    className="text-[#0B63E5] focus:ring-blue-500"
                  />
                  <span>Cập nhật</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-2">
                  <input
                    type="radio"
                    name="modalCustMode"
                    checked={importMode === 'APPEND'}
                    onChange={() => setImportMode('APPEND')}
                    className="text-[#0B63E5] focus:ring-blue-500"
                  />
                  <span>Chỉ thêm mới</span>
                </label>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 font-semibold text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={previewCustomers.length === 0}
                  onClick={handleConfirmImport}
                  className={`px-5 py-2 font-bold text-xs text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-all ${
                    previewCustomers.length > 0
                      ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác Nhận Nhập ({previewCustomers.length} Khách Hàng)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: CUSTOMER DETAILS */}
      {/* ========================================================================= */}
      {detailCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Chi Tiết Khách Hàng</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{detailCustomer.code}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailCustomer(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 text-center">
                <div className="w-14 h-14 rounded-full bg-purple-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                  {detailCustomer.name.slice(0, 1).toUpperCase()}
                </div>
                <h2 className="text-base font-bold text-slate-900">{detailCustomer.name}</h2>
                <div className="text-xs text-purple-700 font-medium mt-0.5">
                  {detailCustomer.group || 'Khách lẻ'} • {detailCustomer.customer_type || detailCustomer.type || 'Cá nhân'}
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <span className="text-[11px] text-rose-700 font-medium">Nợ hiện tại</span>
                  <div className="text-base font-bold text-rose-700 font-mono mt-0.5">
                    {formatCurrency(detailCustomer.debt)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 font-medium">Tổng mua tích lũy</span>
                  <div className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                    {formatCurrency(detailCustomer.total_purchased)}
                  </div>
                </div>
              </div>

              {/* Info details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-semibold text-slate-800">{detailCustomer.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{detailCustomer.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Địa chỉ:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[60%]">{detailCustomer.address || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Phường / Xã:</span>
                  <span className="font-semibold text-slate-800">{detailCustomer.ward || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Khu vực:</span>
                  <span className="font-semibold text-slate-800">{detailCustomer.district_city || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Mã số thuế:</span>
                  <span className="font-semibold text-slate-800 font-mono">{detailCustomer.tax_code || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">CMND / CCCD:</span>
                  <span className="font-semibold text-slate-800 font-mono">{detailCustomer.id_card || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Chi nhánh:</span>
                  <span className="font-semibold text-slate-800">{detailCustomer.branch || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Ngày tạo:</span>
                  <span className="font-semibold text-slate-800">{detailCustomer.created_at || '—'}</span>
                </div>
                {detailCustomer.note && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">Ghi chú:</span>
                    <p className="text-slate-700 text-xs">{detailCustomer.note}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              {detailCustomer.debt > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailCustomer(null);
                    handleOpenCollectDebt(detailCustomer);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Thu Nợ</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    const c = detailCustomer;
                    setDetailCustomer(null);
                    handleOpenEdit(c);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Chỉnh Sửa
                </button>
                <button
                  type="button"
                  onClick={() => setDetailCustomer(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Address View Modal */}
      {addressDetailModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setAddressDetailModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B63E5] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Thông tin địa chỉ giao nhận</h3>
                  <p className="text-[11px] text-slate-500">Khách hàng: <span className="font-semibold text-slate-700">{addressDetailModal.customer.name}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddressDetailModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 text-[11px] uppercase font-semibold">Địa chỉ đầy đủ</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(addressDetailModal.fullAddress);
                      showToast('Đã sao chép địa chỉ vào bộ nhớ tạm!', 'success');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B63E5] hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Sao chép
                  </button>
                </div>
                <p className="text-slate-800 font-medium text-sm leading-relaxed select-all">
                  {addressDetailModal.fullAddress}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">Điện thoại</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {addressDetailModal.customer.phone || 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">Mã khách hàng</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {addressDetailModal.customer.code}
                  </span>
                </div>
                {addressDetailModal.customer.ward && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">Phường / Xã</span>
                    <span className="font-medium text-slate-700">
                      {addressDetailModal.customer.ward}
                    </span>
                  </div>
                )}
                {addressDetailModal.customer.district_city && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">Quận / Huyện / Tỉnh</span>
                    <span className="font-medium text-slate-700">
                      {addressDetailModal.customer.district_city}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const cust = addressDetailModal.customer;
                  setAddressDetailModal(null);
                  setDetailCustomer(cust);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B63E5] hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Xem hồ sơ đầy đủ
              </button>
              <button
                type="button"
                onClick={() => setAddressDetailModal(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-2xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
