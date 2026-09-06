import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderItemRecord, DuplicateStrategy } from '../../types';
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  formatDate,
  exportToExcel,
  downloadInvoiceTemplate,
  parseExcelFile,
  findHeaderValue,
  parseCleanNumber,
} from '../../utils/formatters';
import { exportInvoiceToPdf } from '../../utils/pdfExport';
import { InvoicePdfModal } from '../common/InvoicePdfModal';
import { useInvoiceFilters } from './useInvoiceFilters';
import { useUiShell } from '../../context/slices/UiShellContext';
import { Pagination } from '../common/Pagination';
import { KiotVietDateRangePicker } from '../common/KiotVietDateRangePicker';
import { InvoiceSearchPopover, InvoiceSearchParams } from './InvoiceSearchPopover';
import {
  Search,
  Filter,
  Receipt,
  FileSpreadsheet,
  Edit3,
  Trash2,
  Printer,
  Ban,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  DollarSign,
  Plus,
  Minus,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  Tag,
  Store,
  Eye,
  Upload,
  Download,
  FileText,
  Mic,
  Star,
  SlidersHorizontal,
  MoreHorizontal,
} from 'lucide-react';

export const InvoiceManagementScreen: React.FC = () => {
  const {
    orders,
    products,
    updateOrder,
    cancelOrder,
    restoreOrder,
    deleteOrder,
    openOrderReceipt,
    importOrders,
    setCurrentView,
    currentBranch,
    showToast,
    currentUser,
  } = useApp();
  const { requestVoiceAssistant } = useUiShell();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'TRANSFER' | 'CARD'>('ALL');
  const [cashierFilter, setCashierFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'MONTH' | 'LAST_MONTH' | 'CUSTOM'>('MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('NEWEST');

  // KiotViet Date Range Picker & Search Popover State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState<InvoiceSearchParams>({
    code: '',
    productKeyword: '',
    customerKeyword: '',
  });

  // Starred & Selected orders
  const [starredOrderIds, setStarredOrderIds] = useState<Set<string>>(() => new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set());

  const datePickerAnchorRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const productByIdMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Unique Cashiers for sidebar filter
  const uniqueCashiers = useMemo(() => {
    const list = orders.map((o) => (o.cashier || 'Admin').trim()).filter(Boolean);
    return Array.from(new Set(list));
  }, [orders]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // PDF Modal State
  const [selectedPdfOrder, setSelectedPdfOrder] = useState<Order | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Excel Import with Schema State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewOrders, setPreviewOrders] = useState<Partial<Order>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('OVERWRITE');
  const [syncStock, setSyncStock] = useState(true);
  const [syncCashbook, setSyncCashbook] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editFormData, setEditFormData] = useState<{
    code: string;
    created_at: string;
    customer_name: string;
    phone: string;
    cashier: string;
    payment_method: 'CASH' | 'TRANSFER' | 'CARD';
    note: string;
    discountType: 'AMOUNT' | 'PERCENT';
    discountValue: number;
    items: {
      product_id: string;
      sku: string;
      name: string;
      unit: string;
      quantity: number;
      price: number;
      cost_price: number;
    }[];
    adjustStock: boolean;
    adjustCashbook: boolean;
  } | null>(null);

  // Add Product to Editing Order search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

  // Cancel Order Modal State
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý / Trả hàng');
  const [returnStockOnCancel, setReturnStockOnCancel] = useState(true);

  // View Details Modal State
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // Delete Confirmation Modal State
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [returnStockOnDelete, setReturnStockOnDelete] = useState(false);

  const { filteredOrders, paginatedOrders, stats, isFiltered } = useInvoiceFilters({
    orders,
    statusFilter,
    paymentFilter,
    cashierFilter,
    searchTerm,
    advancedSearch,
    dateFilter,
    customStartDate,
    customEndDate,
    sortBy,
    currentPage,
    pageSize,
  });

  // Handle Export to Excel
  const handleExportOrdersToExcel = () => {
    if (filteredOrders.length === 0) {
      showToast('Không có dữ liệu hóa đơn để xuất Excel!', 'warning');
      return;
    }

    const excelData = filteredOrders.map((o) => ({
      'Mã Hóa Đơn': o.code,
      'Thời Gian': o.created_at,
      'Khách Hàng': o.customer_name,
      'Số Điện Thoại': o.phone,
      'Trạng Thái': o.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy',
      'Hình Thức Thanh Toán':
        o.payment_method === 'CASH'
          ? 'Tiền mặt'
          : o.payment_method === 'TRANSFER'
          ? 'Chuyển khoản QR'
          : 'Thẻ ATM/Visa',
      'Tổng Tiền Hàng (đ)': o.total,
      'Chiết Khấu/Giảm Giá (đ)': o.discount,
      'Khách Đã Trả (đ)': o.final_amount,
      'Tổng Giá Vốn (đ)': o.total_cost,
      'Lợi Nhuận Gộp (đ)': o.profit,
      'Thu Ngân': o.cashier,
      'Ghi Chú': o.note || '',
      'Chi Tiết Sản Phẩm': o.items
        .map((i) => `${i.name} (SL: ${i.quantity} ${i.unit} x ${formatCurrency(i.price)})`)
        .join('; '),
    }));

    exportToExcel(
      excelData,
      `Danh_sach_hoa_don_POS_${new Date().toISOString().slice(0, 10)}`,
      'HoaDon'
    );
    showToast(`Đã xuất ${excelData.length} hóa đơn ra file Excel thành công!`, 'success');
  };

  // Open Edit Order Modal
  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditFormData({
      code: order.code,
      created_at: order.created_at,
      customer_name: order.customer_name,
      phone: order.phone || '',
      cashier: order.cashier || 'Admin',
      payment_method: order.payment_method || 'CASH',
      note: order.note || '',
      discountType: 'AMOUNT',
      discountValue: order.discount || 0,
      items: order.items.map((i) => ({ ...i })),
      adjustStock: true,
      adjustCashbook: true,
    });
    setProductSearchQuery('');
    setIsProductSearchOpen(false);
  };

  // Update item in edit form
  const handleUpdateEditItemQuantity = (productId: string, delta: number) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      items: editFormData.items
        .map((item) => {
          if (item.product_id !== productId) return item;
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        })
        .filter(Boolean) as typeof editFormData.items,
    });
  };

  const handleSetEditItemQuantity = (productId: string, quantity: number) => {
    if (!editFormData) return;
    if (quantity <= 0) {
      handleRemoveEditItem(productId);
      return;
    }
    setEditFormData({
      ...editFormData,
      items: editFormData.items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    });
  };

  const handleSetEditItemPrice = (productId: string, price: number) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      items: editFormData.items.map((item) =>
        item.product_id === productId ? { ...item, price: Math.max(0, price) } : item
      ),
    });
  };

  const handleRemoveEditItem = (productId: string) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      items: editFormData.items.filter((item) => item.product_id !== productId),
    });
  };

  // Add product to editing order
  const handleAddProductToEditOrder = (product: any) => {
    if (!editFormData) return;
    const existing = editFormData.items.find((i) => i.product_id === product.id);
    if (existing) {
      handleUpdateEditItemQuantity(product.id, 1);
    } else {
      const newItem = {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        quantity: 1,
        price: product.selling_price,
        cost_price: product.cost_price,
      };
      setEditFormData({
        ...editFormData,
        items: [...editFormData.items, newItem],
      });
    }
    setProductSearchQuery('');
    setIsProductSearchOpen(false);
    showToast(`Đã thêm ${product.name} vào hóa đơn`, 'success');
  };

  // Calculate live totals for Edit Form
  const editCalculated = useMemo(() => {
    if (!editFormData) return { subtotal: 0, discount: 0, finalAmount: 0, totalCost: 0, profit: 0 };

    const subtotal = editFormData.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalCost = editFormData.items.reduce((sum, i) => sum + i.cost_price * i.quantity, 0);

    let discount = 0;
    if (editFormData.discountType === 'PERCENT') {
      discount = Math.round((subtotal * editFormData.discountValue) / 100);
    } else {
      discount = Math.min(subtotal, Math.max(0, editFormData.discountValue));
    }

    const finalAmount = Math.max(0, subtotal - discount);
    const profit = finalAmount - totalCost;

    return {
      subtotal,
      discount,
      finalAmount,
      totalCost,
      profit,
    };
  }, [editFormData]);

  // Save Edit Order Form
  const handleSaveEditedOrder = (printAfterSave: boolean = false) => {
    if (!editingOrder || !editFormData) return;

    if (editFormData.items.length === 0) {
      showToast('Hóa đơn phải có ít nhất 1 sản phẩm!', 'warning');
      return;
    }

    const updatedOrder: Partial<Order> = {
      code: editFormData.code.trim() || editingOrder.code,
      created_at: editFormData.created_at || editingOrder.created_at,
      customer_name: editFormData.customer_name.trim() || 'Khách lẻ',
      phone: editFormData.phone.trim(),
      cashier: editFormData.cashier.trim(),
      payment_method: editFormData.payment_method,
      note: editFormData.note.trim(),
      items: editFormData.items,
      total: editCalculated.subtotal,
      discount: editCalculated.discount,
      final_amount: editCalculated.finalAmount,
      total_cost: editCalculated.totalCost,
      profit: editCalculated.profit,
    };

    updateOrder(editingOrder.id, updatedOrder, {
      adjustStock: editFormData.adjustStock,
      adjustCashbook: editFormData.adjustCashbook,
    });

    const finalMergedOrder: Order = {
      ...editingOrder,
      ...updatedOrder,
    } as Order;

    setEditingOrder(null);
    setEditFormData(null);

    if (printAfterSave) {
      openOrderReceipt(finalMergedOrder);
    }
  };

  // Confirm cancel order
  const handleConfirmCancelOrder = () => {
    if (!cancelingOrder) return;
    cancelOrder(cancelingOrder.id, returnStockOnCancel, cancelReason);
    setCancelingOrder(null);
  };

  // Confirm permanent delete
  const handleConfirmDeleteOrder = () => {
    if (!deletingOrderId) return;
    deleteOrder(deletingOrderId, returnStockOnDelete);
    setDeletingOrderId(null);
  };

  // Excel Upload Parser for Invoices
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

      // Build O(1) product lookup maps before iterating rows
      const productBySku = new Map<string, (typeof products)[0]>();
      const productByName = new Map<string, (typeof products)[0]>();
      for (const p of products) {
        if (p.sku) productBySku.set(p.sku.trim().toLowerCase(), p);
        if (p.name) productByName.set(p.name.trim().toLowerCase(), p);
      }

      // Group rows by order code
      const orderMap = new Map<string, Partial<Order>>();
      const errors: string[] = [];

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const rawCode = findHeaderValue(row, ['mahoadon', 'madonhang', 'mahd', 'madon', 'code', 'ordercode', 'invoice_code', 'ma']);
        const code = String(rawCode || '').trim() || `HD-${Date.now().toString().slice(-6)}-${idx + 1}`;

        const rawCreatedAt = findHeaderValue(row, ['thoigian', 'ngaytao', 'ngayhoadon', 'ngayban', 'createdat', 'created_at', 'time', 'date']);
        const createdAt = rawCreatedAt ? formatDateTime(rawCreatedAt) : new Date().toLocaleString('vi-VN');

        const rawCust = findHeaderValue(row, ['tenkhachhang', 'khachhang', 'tenkhach', 'customername', 'customer_name', 'customer', 'doitac']);
        const customerName = String(rawCust || '').trim() || 'Khách lẻ';

        const rawPhone = findHeaderValue(row, ['dienthoai', 'sdt', 'sodienthoai', 'phone', 'tel', 'customerphone']);
        const phone = String(rawPhone || '').trim();

        const rawCashier = findHeaderValue(row, ['thungan', 'nguoiban', 'nhanvien', 'cashier', 'seller', 'user', 'taoboi']);
        const cashier = String(rawCashier || '').trim() || currentUser.name;

        const rawPayment = findHeaderValue(row, ['phuongthucthanhtoan', 'hinhthucthanhtoan', 'thanhtoan', 'paymentmethod', 'payment_method']);
        let paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' = 'CASH';
        if (rawPayment) {
          const p = String(rawPayment).toLowerCase();
          if (p.includes('chuyen khoan') || p.includes('ck') || p.includes('transfer') || p.includes('bank') || p.includes('qr')) {
            paymentMethod = 'TRANSFER';
          } else if (p.includes('the') || p.includes('card') || p.includes('pos')) {
            paymentMethod = 'CARD';
          }
        }

        const rawSku = findHeaderValue(row, ['mahang', 'masp', 'masku', 'sku', 'itemcode', 'productcode']);
        const sku = String(rawSku || '').trim() || 'SP-GEN';

        const rawProdName = findHeaderValue(row, ['tenhang', 'tensanpham', 'tensp', 'tenmathang', 'itemname', 'productname', 'product_name']);
        const productName = String(rawProdName || '').trim() || `Sản phẩm ${sku}`;

        const rawUnit = findHeaderValue(row, ['donvitinh', 'dvt', 'unit']);
        const unit = String(rawUnit || '').trim() || 'Cái';

        const rawQty = findHeaderValue(row, ['soluong', 'sl', 'qty', 'quantity', 'soluongban']);
        const quantity = Math.max(1, parseCleanNumber(rawQty, 1));

        const rawPrice = findHeaderValue(row, ['dongia', 'giaban', 'dongiaban', 'price', 'unitprice', 'sellingprice']);
        const price = parseCleanNumber(rawPrice, 0);

        const rawCost = findHeaderValue(row, ['giavon', 'gianhap', 'dongiavon', 'cost', 'costprice']);
        const costPrice = parseCleanNumber(rawCost, 0);

        const rawDiscount = findHeaderValue(row, ['giamgia', 'chietkhau', 'discount', 'giamgiahoadon']);
        const discount = parseCleanNumber(rawDiscount, 0);

        const rawFinal = findHeaderValue(row, ['khachcantra', 'thucthu', 'tongtien', 'thanhtien', 'finalamount', 'final_amount', 'totalamount']);
        const finalAmount = parseCleanNumber(rawFinal, 0);

        const rawNote = findHeaderValue(row, ['ghichu', 'note', 'diengiai']);
        const note = String(rawNote || '').trim();

        // Check or create order in map
        if (!orderMap.has(code)) {
          orderMap.set(code, {
            code,
            customer_name: customerName,
            phone,
            cashier,
            payment_method: paymentMethod,
            created_at: createdAt,
            status: 'COMPLETED',
            branch: currentBranch?.name || '318 Vũ Quang',
            note,
            discount: discount,
            final_amount: finalAmount,
            items: [],
          });
        }

        const currentOrder = orderMap.get(code)!;
        // find matching product id with O(1) lookup
        const matchedProd = productBySku.get(sku.toLowerCase()) || productByName.get(productName.toLowerCase());
        const productId = matchedProd ? matchedProd.id : `gen-${sku}`;

        currentOrder.items = currentOrder.items || [];
        currentOrder.items.push({
          product_id: productId,
          sku: sku,
          name: productName,
          unit: unit,
          quantity: quantity,
          price: price,
          cost_price: costPrice,
        });

        // If total not set
        const subtotal = currentOrder.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        currentOrder.total = subtotal;
        if (!currentOrder.final_amount || currentOrder.final_amount === 0) {
          currentOrder.final_amount = Math.max(0, subtotal - (currentOrder.discount || 0));
        }
        currentOrder.total_cost = currentOrder.items.reduce((s, i) => s + (i.cost_price || 0) * (i.quantity || 1), 0);
        currentOrder.profit = currentOrder.final_amount - currentOrder.total_cost;
      });

      const parsedList = Array.from(orderMap.values());
      setPreviewOrders(parsedList);
      setImportErrors(errors);
      showToast(`Đã đọc ${parsedList.length} hóa đơn từ file Excel!`, 'success');
    } catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Lỗi khi đọc file Excel: ${message}`, 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load Sample Invoices
  const handleLoadSampleInvoices = () => {
    const sampleList: Partial<Order>[] = [
      {
        code: 'HD202608300001',
        created_at: '30/08/2026 09:15',
        customer_name: 'Phan Minh Tuấn',
        phone: '0911834949',
        cashier: currentUser.name,
        payment_method: 'CASH',
        branch: currentBranch?.name || '318 Vũ Quang',
        note: 'Khách mua tại quầy',
        discount: 10000,
        total: 120000,
        final_amount: 110000,
        total_cost: 80000,
        profit: 30000,
        status: 'COMPLETED',
        items: [
          {
            product_id: 'sample-p1',
            sku: 'SP-SAMPLE-01',
            name: 'Nước ngọt có gas Coca-Cola 330ml',
            unit: 'Lon',
            quantity: 10,
            price: 12000,
            cost_price: 8000,
          },
        ],
      },
      {
        code: 'HD202608300002',
        created_at: '30/08/2026 10:45',
        customer_name: 'Chị Hoa',
        phone: '0977889900',
        cashier: currentUser.name,
        payment_method: 'TRANSFER',
        branch: currentBranch?.name || '318 Vũ Quang',
        note: 'Chuyển khoản VietQR',
        discount: 0,
        total: 299000,
        final_amount: 299000,
        total_cost: 180000,
        profit: 119000,
        status: 'COMPLETED',
        items: [
          {
            product_id: 'sample-p2',
            sku: 'SP-SAMPLE-02',
            name: 'Bình giữ nhiệt Lock&Lock 500ml',
            unit: 'Cái',
            quantity: 1,
            price: 299000,
            cost_price: 18000,
          },
        ],
      },
    ];

    setPreviewOrders(sampleList);
    setImportErrors([]);
    showToast(`Đã nạp ${sampleList.length} hóa đơn mẫu vào bảng xem trước!`, 'info');
  };

  // Confirm Import Invoices
  const handleConfirmImportOrders = () => {
    if (previewOrders.length === 0) return;
    const res = importOrders(previewOrders, duplicateStrategy, { syncStock, syncCashbook });
    showToast(`Đã nhập thành công ${res.inserted + res.updated} hóa đơn vào hệ thống!`, 'success');
    setIsImportModalOpen(false);
    setPreviewOrders([]);
  };

  const toggleStar = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(paginatedOrders.map((o) => o.id)));
    }
  };

  const handleToggleSelectOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
    <div className="space-y-3 pb-8">
      {/* KiotViet 2-Column Main Layout */}
      <div className="flex flex-col md:flex-row items-start gap-3">
        {/* ==================== CỘT TRÁI: BỘ LỌC KIOTVIET ==================== */}
        <div className="w-full md:w-60 lg:w-64 shrink-0 bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-4">
          {/* Sidebar Header: Hóa đơn & Đặt lại */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Hóa đơn</h2>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setAdvancedSearch({ code: '', productKeyword: '', customerKeyword: '' });
                  setStatusFilter('ALL');
                  setPaymentFilter('ALL');
                  setCashierFilter('ALL');
                  setDateFilter('MONTH');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className="text-[11px] text-[#0B63E5] hover:underline font-semibold cursor-pointer"
                title="Xóa tất cả điều kiện lọc"
              >
                Đặt lại
              </button>
            )}
          </div>

          {/* Group 1: Thời gian */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">Thời gian</label>
            <div className="space-y-1.5 text-xs">
              {/* Radio: Tháng này (Mặc định chuẩn KiotViet) */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('MONTH');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                  dateFilter === 'MONTH'
                    ? 'bg-blue-50 text-[#0B63E5] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dateFilter === 'MONTH' ? 'border-[#0B63E5]' : 'border-slate-300'
                    }`}
                  >
                    {dateFilter === 'MONTH' && (
                      <div className="w-2 h-2 rounded-full bg-[#0B63E5]" />
                    )}
                  </div>
                  <span>Tháng này</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Radio: Hôm nay */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('TODAY');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                  dateFilter === 'TODAY'
                    ? 'bg-blue-50 text-[#0B63E5] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dateFilter === 'TODAY' ? 'border-[#0B63E5]' : 'border-slate-300'
                    }`}
                  >
                    {dateFilter === 'TODAY' && (
                      <div className="w-2 h-2 rounded-full bg-[#0B63E5]" />
                    )}
                  </div>
                  <span>Hôm nay</span>
                </div>
              </button>

              {/* Radio: Tháng trước */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('LAST_MONTH');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                  dateFilter === 'LAST_MONTH'
                    ? 'bg-blue-50 text-[#0B63E5] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dateFilter === 'LAST_MONTH' ? 'border-[#0B63E5]' : 'border-slate-300'
                    }`}
                  >
                    {dateFilter === 'LAST_MONTH' && (
                      <div className="w-2 h-2 rounded-full bg-[#0B63E5]" />
                    )}
                  </div>
                  <span>Tháng trước</span>
                </div>
              </button>

              {/* Radio: Toàn thời gian */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter('ALL');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                  dateFilter === 'ALL'
                    ? 'bg-blue-50 text-[#0B63E5] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      dateFilter === 'ALL' ? 'border-[#0B63E5]' : 'border-slate-300'
                    }`}
                  >
                    {dateFilter === 'ALL' && (
                      <div className="w-2 h-2 rounded-full bg-[#0B63E5]" />
                    )}
                  </div>
                  <span>Toàn thời gian</span>
                </div>
              </button>

              {/* Radio: Tùy chỉnh (Gắn Popover KiotVietDateRangePicker chuẩn) */}
              <div ref={datePickerAnchorRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('CUSTOM');
                    setIsDatePickerOpen(true);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    dateFilter === 'CUSTOM'
                      ? 'bg-blue-50 text-[#0B63E5] font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        dateFilter === 'CUSTOM' ? 'border-[#0B63E5]' : 'border-slate-300'
                      }`}
                    >
                      {dateFilter === 'CUSTOM' && (
                        <div className="w-2 h-2 rounded-full bg-[#0B63E5]" />
                      )}
                    </div>
                    <span>Tùy chỉnh</span>
                  </div>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Popover Bộ chọn ngày 2 lịch song song chuẩn KiotViet */}
                <KiotVietDateRangePicker
                  isOpen={isDatePickerOpen}
                  onClose={() => setIsDatePickerOpen(false)}
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onApply={(start, end) => {
                    setCustomStartDate(start);
                    setCustomEndDate(end);
                    setDateFilter('CUSTOM');
                    setCurrentPage(1);
                  }}
                  anchorRef={datePickerAnchorRef}
                />

                {/* Badge dải ngày đã chọn */}
                {dateFilter === 'CUSTOM' && customStartDate && customEndDate && (
                  <div className="mt-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-medium flex items-center justify-between">
                    <span className="truncate">
                      {formatDate(customStartDate)} - {formatDate(customEndDate)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setDateFilter('MONTH');
                      }}
                      className="text-blue-500 hover:text-blue-800 p-0.5 ml-1"
                      title="Hủy tùy chỉnh"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group 2: Trạng thái hóa đơn */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">Trạng thái hóa đơn</label>
            <div className="space-y-1.5 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={statusFilter === 'ALL' || statusFilter === 'COMPLETED'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setStatusFilter(statusFilter === 'CANCELLED' ? 'ALL' : 'COMPLETED');
                    } else {
                      setStatusFilter(statusFilter === 'ALL' ? 'CANCELLED' : 'COMPLETED');
                    }
                    setCurrentPage(1);
                  }}
                  className="rounded text-[#0B63E5] focus:ring-0 cursor-pointer"
                />
                <span>Hoàn thành</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={statusFilter === 'ALL' || statusFilter === 'CANCELLED'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'CANCELLED');
                    } else {
                      setStatusFilter(statusFilter === 'ALL' ? 'COMPLETED' : 'CANCELLED');
                    }
                    setCurrentPage(1);
                  }}
                  className="rounded text-[#0B63E5] focus:ring-0 cursor-pointer"
                />
                <span>Đã hủy</span>
              </label>
            </div>
          </div>

          {/* Group 3: Phương thức thanh toán */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">Phương thức thanh toán</label>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-[#0B63E5] cursor-pointer"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản QR</option>
              <option value="CARD">Quẹt thẻ ATM/Visa</option>
            </select>
          </div>

          {/* Group 4: Người bán / Thu ngân */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">Người bán</label>
            <select
              value={cashierFilter}
              onChange={(e) => {
                setCashierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-[#0B63E5] cursor-pointer"
            >
              <option value="ALL">Tất cả người bán</option>
              {uniqueCashiers.map((cashier) => (
                <option key={cashier} value={cashier}>
                  {cashier}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ==================== CỘT PHẢI: BẢNG DỮ LIỆU & THANH CÔNG CỤ ==================== */}
        <div className="flex-1 min-w-0 space-y-2.5 w-full">
          {/* Thanh công cụ KiotViet (Top Action Bar) */}
          <div className="bg-white p-2.5 md:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Ô tìm kiếm đa tiêu chí KiotViet */}
            <div ref={searchContainerRef} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm || advancedSearch.code}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setAdvancedSearch({ ...advancedSearch, code: e.target.value });
                  setCurrentPage(1);
                }}
                onClick={() => setIsSearchPopoverOpen(true)}
                placeholder="Theo mã hóa đơn"
                className="w-full pl-9 pr-8 py-2 bg-white text-xs text-slate-800 border border-slate-200 rounded-lg focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all placeholder:text-slate-400 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setIsSearchPopoverOpen(!isSearchPopoverOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                title="Mở rộng tra cứu"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Search Popover KiotViet */}
              <InvoiceSearchPopover
                isOpen={isSearchPopoverOpen}
                onClose={() => setIsSearchPopoverOpen(false)}
                searchParams={advancedSearch}
                onChangeParams={(p) => {
                  setAdvancedSearch(p);
                  if (p.code) setSearchTerm(p.code);
                }}
                onSearch={() => setCurrentPage(1)}
                onReset={() => {
                  setAdvancedSearch({ code: '', productKeyword: '', customerKeyword: '' });
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                containerRef={searchContainerRef}
              />
            </div>

            {/* Các nút thao tác chuẩn KiotViet */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* Nút Tạo mới v (POS) */}
              <button
                type="button"
                onClick={() => setCurrentView('pos')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B63E5] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo mới</span>
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
              </button>

              {/* Nút Import file */}
              {currentUser.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                  title="Nhập danh sách hóa đơn từ file Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import file</span>
                </button>
              )}

              {/* Nút Xuất file */}
              <button
                type="button"
                onClick={handleExportOrdersToExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                title={`Xuất ${filteredOrders.length} hóa đơn ra file Excel`}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Xuất file</span>
                <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
              </button>

              {/* Nút Lập HĐ bằng giọng nói */}
              <button
                type="button"
                onClick={() => requestVoiceAssistant('POS_ORDER')}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                title="Lập hóa đơn nhanh bằng trợ lý AI"
              >
                <Mic className="w-3.5 h-3.5 text-amber-300" />
                <span>Giọng nói</span>
              </button>
            </div>
          </div>

          {/* Bảng Dữ Liệu Hóa Đơn Chuẩn KiotViet */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[980px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={paginatedOrders.length > 0 && selectedOrderIds.size === paginatedOrders.length}
                        onChange={handleToggleSelectAll}
                        className="rounded text-[#0B63E5] focus:ring-0 cursor-pointer"
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="py-2.5 px-2 w-7 text-center">
                      <Star className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                    </th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Mã hóa đơn</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Thời gian</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Thời gian tạo</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Khách hàng</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Tổng tiền hàng</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Giảm giá</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Khách đã trả</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-slate-50/90 z-20">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* DÒNG TỔNG KẾT NỔI BẬT CHUẨN KIOTVIET (Ảnh 1, 4) */}
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-bold text-slate-900">
                    <td className="py-2.5 px-3"></td>
                    <td className="py-2.5 px-2"></td>
                    <td className="py-2.5 px-3"></td>
                    <td className="py-2.5 px-3"></td>
                    <td className="py-2.5 px-3"></td>
                    <td className="py-2.5 px-3 font-semibold text-slate-500">
                      {filteredOrders.length > 0 && `${stats.totalOrdersCount} hóa đơn`}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-slate-900">
                      {formatNumber(stats.totalGrossAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-slate-900">
                      {formatNumber(stats.totalDiscount)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-slate-900">
                      {formatNumber(stats.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 sticky right-0 bg-slate-50/90 z-10"></td>
                  </tr>

                  {/* Danh sách các hóa đơn */}
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600">Không tìm thấy hóa đơn nào phù hợp!</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Thử thay đổi điều kiện lọc thời gian hoặc tạo đơn bán hàng mới.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => {
                      const isCompleted = order.status === 'COMPLETED';
                      const isStarred = starredOrderIds.has(order.id);
                      const isSelected = selectedOrderIds.has(order.id);

                      return (
                        <tr
                          key={order.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !isCompleted ? 'bg-rose-50/20 text-slate-400' : isSelected ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectOrder(order.id, e)}
                              className="rounded text-[#0B63E5] focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Star */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={(e) => toggleStar(order.id, e)}
                              className="text-slate-300 hover:text-amber-400 p-0.5 cursor-pointer transition-colors"
                              title={isStarred ? 'Bỏ đánh dấu' : 'Đánh dấu sao'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 mx-auto ${
                                  isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Mã hóa đơn */}
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingOrder(order)}
                              className="text-[#0B63E5] hover:underline font-bold text-xs cursor-pointer flex items-center gap-1"
                              title="Xem chi tiết hóa đơn"
                            >
                              <span>{order.code}</span>
                              {order.note && (
                                <span
                                  title={`Ghi chú: ${order.note}`}
                                  className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                                />
                              )}
                            </button>
                            <div className="text-[10px] text-slate-400 font-normal">
                              Thu ngân: {order.cashier || 'Admin'}
                            </div>
                          </td>

                          {/* Thời gian */}
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {formatDateTime(order.created_at)}
                          </td>

                          {/* Thời gian tạo */}
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {formatDateTime(order.created_at)}
                          </td>

                          {/* Khách hàng */}
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800">
                              {order.customer_name || 'Khách lẻ'}
                            </div>
                            {order.phone && (
                              <div className="text-[11px] text-slate-400">{order.phone}</div>
                            )}
                          </td>

                          {/* Tổng tiền hàng */}
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                            {formatNumber(order.total)}
                          </td>

                          {/* Giảm giá */}
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                            {formatNumber(order.discount)}
                          </td>

                          {/* Khách đã trả */}
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatNumber(order.final_amount)}
                          </td>

                          {/* Thao tác */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-white hover:bg-slate-50/80 transition-colors z-10">
                            <div className="flex items-center justify-end gap-1">
                              {/* In phiếu thu K80 */}
                              <button
                                type="button"
                                onClick={() => openOrderReceipt(order)}
                                title="In lại hóa đơn K80"
                                className="p-1 text-slate-500 hover:text-[#0B63E5] hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Xuất PDF */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPdfOrder(order);
                                  setIsPdfModalOpen(true);
                                }}
                                title="Xuất hóa đơn PDF & In ấn (K80 / A4)"
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Sửa hóa đơn */}
                              {currentUser.permissions.canEditInvoices && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(order)}
                                  title="Cập nhật / Sửa thông tin hóa đơn"
                                  className="p-1 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Hủy / Khôi phục hóa đơn */}
                              {currentUser.permissions.canCancelInvoices && (
                                isCompleted ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancelingOrder(order);
                                      setCancelReason('Khách đổi ý / Trả hàng');
                                      setReturnStockOnCancel(true);
                                    }}
                                    title="Hủy hóa đơn & Hoàn trả kho"
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => restoreOrder(order.id)}
                                    title="Khôi phục hóa đơn"
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}

                              {/* Xóa vĩnh viễn (Chỉ Admin) */}
                              {currentUser.permissions.canDeleteInvoices && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingOrderId(order.id);
                                    setReturnStockOnDelete(order.status === 'COMPLETED');
                                  }}
                                  title="Xóa vĩnh viễn (Chỉ Admin)"
                                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân Trang & Chân Bảng KiotViet */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value={15}>15 dòng</option>
                  <option value={20}>20 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
                <span className="text-slate-400">|</span>
                <span>
                  Tổng <strong>{filteredOrders.length}</strong> hóa đơn
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredOrders.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[15, 20, 50, 100]}
                  itemLabel="hóa đơn"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: EDIT / UPDATE PAST INVOICE (Cập nhật Hóa Đơn Cũ) */}
      {editingOrder && editFormData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 md:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0B63E5] text-white flex items-center justify-center shadow-xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Cập nhật Hóa đơn: <span className="text-[#0B63E5]">{editingOrder.code}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Điều chỉnh danh sách mặt hàng, số lượng, đơn giá, chiết khấu và tự động đồng bộ tồn kho
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingOrder(null);
                  setEditFormData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 text-xs">
              {/* Section 1: Customer & Invoice Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mã hóa đơn</label>
                  <input
                    type="text"
                    value={editFormData.code}
                    onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày giờ lập hóa đơn</label>
                  <input
                    type="text"
                    value={editFormData.created_at}
                    onChange={(e) => setEditFormData({ ...editFormData, created_at: e.target.value })}
                    placeholder="Ví dụ: 14:30 30/08/2026"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Hình thức thanh toán</label>
                  <select
                    value={editFormData.payment_method}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        payment_method: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none font-medium text-slate-800"
                  >
                    <option value="CASH">💵 Tiền mặt</option>
                    <option value="TRANSFER">📱 Chuyển khoản VietQR</option>
                    <option value="CARD">💳 Quẹt thẻ POS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tên khách hàng</label>
                  <input
                    type="text"
                    value={editFormData.customer_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, customer_name: e.target.value })
                    }
                    placeholder="Khách lẻ..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="0912..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nhân viên thu ngân</label>
                  <input
                    type="text"
                    value={editFormData.cashier}
                    onChange={(e) => setEditFormData({ ...editFormData, cashier: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-slate-600 font-semibold mb-1">Ghi chú đơn hàng</label>
                  <input
                    type="text"
                    value={editFormData.note}
                    onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                    placeholder="Nhập ghi chú giao dịch nếu có..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:border-[#0B63E5] focus:outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Section 2: Items List & Add Product */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#0B63E5]" />
                    Danh sách sản phẩm trong hóa đơn ({editFormData.items.length})
                  </h3>

                  {/* Add Product Dropdown Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProductSearchOpen(!isProductSearchOpen)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0B63E5] font-semibold rounded-lg border border-blue-200 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm sản phẩm vào đơn
                    </button>

                    {/* Product Search Dropdown Popup */}
                    {isProductSearchOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 z-30 animate-in fade-in duration-100">
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            autoFocus
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="Tìm sản phẩm theo tên, SKU..."
                            className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#0B63E5]"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-50">
                          {products
                            .filter(
                              (p) =>
                                productSearchQuery === '' ||
                                p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                                p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
                            )
                            .slice(0, 8)
                            .map((prod) => (
                              <button
                                key={prod.id}
                                onClick={() => handleAddProductToEditOrder(prod)}
                                className="w-full text-left p-1.5 hover:bg-blue-50 rounded flex items-center justify-between transition-colors cursor-pointer group"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-semibold text-slate-800 text-[11px] truncate group-hover:text-[#0B63E5]">
                                    {prod.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {prod.sku} • Tồn: {prod.stock} {prod.unit}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 font-bold text-slate-900 text-[11px]">
                                  {formatCurrency(prod.selling_price)}
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Tên sản phẩm</th>
                        <th className="py-2.5 px-3 text-center w-28">Số lượng</th>
                        <th className="py-2.5 px-3 text-right w-32">Đơn giá (đ)</th>
                        <th className="py-2.5 px-3 text-right w-32">Thành tiền</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editFormData.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            Chưa có sản phẩm nào trong hóa đơn. Vui lòng bấm &quot;Thêm sản phẩm&quot;!
                          </td>
                        </tr>
                      ) : (
                        editFormData.items.map((item, index) => {
                          const product = productByIdMap.get(item.product_id);
                          const itemTotal = item.price * item.quantity;

                          return (
                            <tr key={item.product_id || index} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">{item.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  SKU: {item.sku} {product ? `• Kho hiện có: ${product.stock} ${item.unit}` : ''}
                                </div>
                              </td>

                              {/* Quantity controls */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEditItemQuantity(item.product_id, -1)}
                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-all cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    onFocus={(e) => e.target.select()}
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleSetEditItemQuantity(item.product_id, parseInt(e.target.value) || 0)
                                    }
                                    className="w-12 text-center font-bold text-slate-900 border border-slate-200 rounded py-0.5 focus:border-[#0B63E5] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEditItemQuantity(item.product_id, 1)}
                                    className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* Unit Price */}
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  onFocus={(e) => e.target.select()}
                                  min={0}
                                  value={item.price}
                                  onChange={(e) =>
                                    handleSetEditItemPrice(item.product_id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-24 text-right font-medium text-slate-900 border border-slate-200 rounded px-1.5 py-0.5 focus:border-[#0B63E5] focus:outline-none"
                                />
                              </td>

                              {/* Item Total */}
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {formatCurrency(itemTotal)}
                              </td>

                              {/* Delete Item */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditItem(item.product_id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-all cursor-pointer"
                                  title="Xóa món"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Calculations & Discount Adjustments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                {/* Discount options */}
                <div className="space-y-3">
                  <label className="block text-slate-700 font-semibold">Chiết khấu / Giảm giá đơn hàng</label>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, discountType: 'AMOUNT' })}
                        className={`px-3 py-1.5 font-semibold text-xs transition-all cursor-pointer ${
                          editFormData.discountType === 'AMOUNT'
                            ? 'bg-[#0B63E5] text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        VND (Tiền mặt)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, discountType: 'PERCENT' })}
                        className={`px-3 py-1.5 font-semibold text-xs transition-all cursor-pointer ${
                          editFormData.discountType === 'PERCENT'
                            ? 'bg-[#0B63E5] text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        % (Phần trăm)
                      </button>
                    </div>

                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min={0}
                      value={editFormData.discountValue}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          discountValue: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:border-[#0B63E5] focus:outline-none"
                      placeholder="0"
                    />
                  </div>

                  {/* Stock & Cashbook sync checkboxes */}
                  <div className="pt-2 space-y-2">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.adjustStock}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, adjustStock: e.target.checked })
                        }
                        className="w-4 h-4 text-[#0B63E5] rounded focus:ring-0 cursor-pointer"
                      />
                      <span className="font-medium">
                        Tự động bù trừ / hoàn trả chênh lệch tồn kho theo số lượng mới
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.adjustCashbook}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, adjustCashbook: e.target.checked })
                        }
                        className="w-4 h-4 text-[#0B63E5] rounded focus:ring-0 cursor-pointer"
                      />
                      <span className="font-medium">
                        Tự động đồng bộ số tiền chênh lệch vào Sổ quỹ (Thu/Chi)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Live Totals summary */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(editCalculated.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Chiết khấu giảm giá:</span>
                    <span className="font-semibold">
                      -{formatCurrency(editCalculated.discount)}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>Khách cần trả (Thực thu):</span>
                    <span className="text-base text-[#0B63E5]">
                      {formatCurrency(editCalculated.finalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-600 pt-1">
                    <span>Lợi nhuận gộp ước tính:</span>
                    <span className="font-bold">{formatCurrency(editCalculated.profit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setEditFormData(null);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveEditedOrder(true)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4" />
                  Lưu & In lại hóa đơn K80
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveEditedOrder(false)}
                  className="px-5 py-2 bg-[#0B63E5] hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Lưu cập nhật hóa đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CANCEL ORDER CONFIRMATION */}
      {cancelingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Xác nhận hủy hóa đơn {cancelingOrder.code}?
                </h3>
                <p className="text-xs text-slate-500">
                  Hành động này sẽ cập nhật trạng thái đơn hàng sang Đã hủy
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lý do hủy hóa đơn</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="Khách đổi ý / Không mua nữa">Khách đổi ý / Không mua nữa</option>
                  <option value="Khách trả lại toàn bộ hàng">Khách trả lại toàn bộ hàng</option>
                  <option value="Nhập sai số lượng / sai giá">Nhập sai số lượng / sai giá</option>
                  <option value="Lỗi thu ngân khi tạo đơn">Lỗi thu ngân khi tạo đơn</option>
                  <option value="Khác">Lý do khác...</option>
                </select>
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnStockOnCancel}
                  onChange={(e) => setReturnStockOnCancel(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-0 cursor-pointer"
                />
                <span className="font-medium">
                  Tự động hoàn trả {cancelingOrder.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm về kho hàng
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelingOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-2xs"
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE PERMANENTLY CONFIRMATION */}
      {deletingOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xóa vĩnh viễn hóa đơn?</h3>
                <p className="text-xs text-slate-500">
                  Hóa đơn sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu và không thể khôi phục
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={returnStockOnDelete}
                onChange={(e) => setReturnStockOnDelete(e.target.checked)}
                className="w-4 h-4 text-[#0B63E5] rounded focus:ring-0 cursor-pointer"
              />
              <span className="font-medium">Hoàn trả lại số lượng sản phẩm về kho hàng trước khi xóa</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingOrderId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-2xs"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Direct Excel Import for Invoices with Schema Guide */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0B63E5] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Nhập Danh Sách Hóa Đơn từ Excel (Schema Chuẩn)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ file xuất hóa đơn KiotViet, Sapo, ERP với định dạng gom nhiều mặt hàng theo mã hóa đơn
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setPreviewOrders([]);
                  setImportErrors([]);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* SCHEMA GUIDE BOX */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0B63E5]" />
                    <span className="text-xs font-bold text-blue-950">
                      Cấu trúc Cột Dữ Liệu Hóa Đơn (Schema Mapping Chuẩn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadInvoiceTemplate}
                      className="px-2.5 py-1 bg-white border border-blue-200 rounded-md text-[11px] font-bold text-[#0B63E5] hover:bg-blue-50 flex items-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3 h-3 text-[#0B63E5]" />
                      <span>Tải file Excel Mẫu Chuẩn</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleInvoices}
                      className="px-2.5 py-1 bg-[#0B63E5] text-white rounded-md text-[11px] font-bold hover:bg-blue-700 flex items-center gap-1 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Nạp 2 HĐ Mẫu</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Mã hóa đơn (*)</div>
                    <div className="text-[10px] text-slate-500">Mã đơn (HD2026...)</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Thời gian (*)</div>
                    <div className="text-[10px] text-slate-500">Ngày giờ bán hàng</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Mã hàng & Tên hàng (*)</div>
                    <div className="text-[10px] text-slate-500">Mã SKU, tên sản phẩm</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Số lượng & Đơn giá (*)</div>
                    <div className="text-[10px] text-slate-500">SL bán, giá niêm yết</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Tên KH & SĐT</div>
                    <div className="text-[10px] text-slate-500">Khách lẻ / Khách quen</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Khách cần trả / Thực thu</div>
                    <div className="text-[10px] text-slate-500">Tổng tiền thu thực tế</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Phương thức TT</div>
                    <div className="text-[10px] text-slate-500">Tiền mặt / CK / Thẻ</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <div className="font-bold text-slate-800">Thu ngân & Ghi chú</div>
                    <div className="text-[10px] text-slate-500">Nhân viên bán, ghi chú</div>
                  </div>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20 rounded-xl p-5 text-center transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="invoice-excel-file-modal"
                />
                <label
                  htmlFor="invoice-excel-file-modal"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0B63E5] flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Kéo thả file Excel Hóa Đơn vào đây hoặc <span className="text-[#0B63E5]">chọn file</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hỗ trợ .xlsx, .xls, .csv (Tự động nhóm các dòng cùng Mã Hóa Đơn thành 1 đơn)
                  </div>
                </label>
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
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
              {previewOrders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Xem trước ({previewOrders.length} hóa đơn hợp lệ)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setPreviewOrders([])}
                      className="text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Xóa bảng xem trước
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Mã Hóa Đơn</th>
                          <th className="py-2 px-3">Thời Gian</th>
                          <th className="py-2 px-3">Khách Hàng</th>
                          <th className="py-2 px-3">Chi Tiết Sản Phẩm</th>
                          <th className="py-2 px-3 text-right">Giảm Giá</th>
                          <th className="py-2 px-3 text-right">Thực Thu</th>
                          <th className="py-2 px-3 text-center">Hình Thức</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewOrders.map((o, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-[#0B63E5]">{o.code}</td>
                            <td className="py-2 px-3 text-slate-600">{o.created_at}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-800">{o.customer_name || 'Khách lẻ'}</div>
                              {o.phone && <div className="text-[10px] text-slate-400">{o.phone}</div>}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              {o.items?.map((item, i) => (
                                <div key={i} className="text-[11px]">
                                  • {item.name} <span className="text-slate-400">({item.quantity} {item.unit || 'Cái'} × {formatCurrency(item.price || 0)})</span>
                                </div>
                              ))}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-600">
                              {formatCurrency(o.discount || 0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                              {formatCurrency(o.final_amount || 0)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium">
                                {o.payment_method === 'TRANSFER' ? 'Chuyển khoản' : o.payment_method === 'CARD' ? 'Thẻ' : 'Tiền mặt'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Options */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Khi trùng mã:</span>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none font-semibold text-slate-700"
                  >
                    <option value="OVERWRITE">Ghi đè đơn cũ</option>
                    <option value="KEEP_BOTH">Giữ cả hai (đổi mã)</option>
                    <option value="ERROR">Bỏ qua nếu trùng</option>
                  </select>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncStock}
                    onChange={(e) => setSyncStock(e.target.checked)}
                    className="text-[#0B63E5] rounded"
                  />
                  <span>Tự động trừ tồn kho</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncCashbook}
                    onChange={(e) => setSyncCashbook(e.target.checked)}
                    className="text-[#0B63E5] rounded"
                  />
                  <span>Hạch toán Sổ quỹ</span>
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
                  disabled={previewOrders.length === 0}
                  onClick={handleConfirmImportOrders}
                  className={`px-5 py-2 font-bold text-xs text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-all ${
                    previewOrders.length > 0
                      ? 'bg-[#0B63E5] hover:bg-blue-700 cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác Nhận Nhập ({previewOrders.length} Hóa Đơn)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export & Print Preview Modal */}
      <InvoicePdfModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setSelectedPdfOrder(null);
        }}
        order={selectedPdfOrder}
        branchName={currentBranch?.name || '318 Vũ Quang'}
      />
    </div>
  );
};
