import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderItemRecord, DuplicateStrategy } from '../../types';
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  parseDateToTimestamp,
  exportToExcel,
  downloadInvoiceTemplate,
  parseExcelFile,
  findHeaderValue,
  parseCleanNumber,
} from '../../utils/formatters';
import { exportInvoiceToPdf } from '../../utils/pdfExport';
import { InvoicePdfModal } from '../common/InvoicePdfModal';
import { VoiceActionModal } from '../common/VoiceActionModal';
import { Pagination } from '../common/Pagination';
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'TRANSFER' | 'CARD'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('NEWEST');

  const productByIdMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // PDF Modal State
  const [selectedPdfOrder, setSelectedPdfOrder] = useState<Order | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Voice AI POS Order Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

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

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Status filter
        if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;

        // Payment method filter
        if (paymentFilter !== 'ALL' && order.payment_method !== paymentFilter) return false;

        // Search text matching (Code, Customer name, Phone, Items, Cashier)
        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matchesCode = order.code.toLowerCase().includes(q);
          const matchesCustomer = order.customer_name.toLowerCase().includes(q);
          const matchesPhone = order.phone.toLowerCase().includes(q);
          const matchesCashier = order.cashier?.toLowerCase().includes(q);
          const matchesItem = order.items.some((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
          if (!matchesCode && !matchesCustomer && !matchesPhone && !matchesCashier && !matchesItem) {
            return false;
          }
        }

        // Date Filter
        if (dateFilter !== 'ALL') {
          const orderTs = parseDateToTimestamp(order.created_at);
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

          if (dateFilter === 'TODAY') {
            if (orderTs < startOfToday || orderTs > endOfToday) return false;
          } else if (dateFilter === 'YESTERDAY') {
            const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
            const endOfYesterday = startOfToday - 1;
            if (orderTs < startOfYesterday || orderTs > endOfYesterday) return false;
          } else if (dateFilter === 'LAST7') {
            const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
            if (orderTs < sevenDaysAgo || orderTs > endOfToday) return false;
          } else if (dateFilter === 'MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).getTime();
            if (orderTs < startOfMonth || orderTs > endOfToday) return false;
          } else if (dateFilter === 'CUSTOM') {
            if (customStartDate) {
              const [sy, sm, sd] = customStartDate.split('-').map(Number);
              if (sy && sm && sd) {
                const startTs = new Date(sy, sm - 1, sd, 0, 0, 0).getTime();
                if (orderTs < startTs) return false;
              }
            }
            if (customEndDate) {
              const [ey, em, ed] = customEndDate.split('-').map(Number);
              if (ey && em && ed) {
                const endTs = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
                if (orderTs > endTs) return false;
              }
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at);
        }
        if (sortBy === 'OLDEST') {
          return parseDateToTimestamp(a.created_at) - parseDateToTimestamp(b.created_at);
        }
        if (sortBy === 'AMOUNT_DESC') {
          return (b.final_amount || 0) - (a.final_amount || 0);
        }
        if (sortBy === 'AMOUNT_ASC') {
          return (a.final_amount || 0) - (b.final_amount || 0);
        }
        return parseDateToTimestamp(b.created_at) - parseDateToTimestamp(a.created_at);
      });
  }, [orders, statusFilter, paymentFilter, searchTerm, dateFilter, customStartDate, customEndDate, sortBy]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Statistics Summary (dynamically updates with active filters)
  const stats = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    const completedOrders = filteredOrders.filter((o) => o.status === 'COMPLETED');
    const cancelledOrders = filteredOrders.filter((o) => o.status === 'CANCELLED');

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.final_amount || 0), 0);
    const totalProfit = completedOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
    const averageOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

    return {
      totalOrdersCount,
      completedCount: completedOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      allOrdersCount: orders.length,
    };
  }, [filteredOrders, orders.length]);

  const isFiltered = useMemo(() => {
    return (
      statusFilter !== 'ALL' ||
      paymentFilter !== 'ALL' ||
      dateFilter !== 'ALL' ||
      searchTerm.trim() !== '' ||
      customStartDate !== '' ||
      customEndDate !== ''
    );
  }, [statusFilter, paymentFilter, dateFilter, searchTerm, customStartDate, customEndDate]);

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

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Bar */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0B63E5] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Quản lý & Cập nhật Hóa đơn
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0B63E5] font-semibold">
                  {orders.length} Đơn
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem lịch sử bán hàng, chỉnh sửa thông tin hóa đơn cũ, điều chỉnh số lượng/giá bán và in lại phiếu thu K80
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Mic className="w-4 h-4 text-amber-300" />
            Lập HĐ bằng giọng nói
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#0B63E5] border border-blue-200 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-[#0B63E5]" />
              <span>Nhập hóa đơn</span>
            </button>
          )}

          <button
            onClick={handleExportOrdersToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Xuất Excel ({filteredOrders.length})
          </button>

          <button
            onClick={() => setCurrentView('pos')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0B63E5] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
          >
            <ShoppingBag className="w-4 h-4" />
            Bán hàng POS
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span className="flex items-center gap-1.5">
              <span>Doanh thu thực tế</span>
              {isFiltered && (
                <span className="text-[10px] bg-blue-100 text-[#0B63E5] px-1.5 py-0.5 rounded font-bold">
                  Bộ lọc
                </span>
              )}
            </span>
            <DollarSign className="w-4 h-4 text-[#0B63E5]" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {stats.completedCount} đơn thành công {isFiltered ? `(${stats.totalOrdersCount} đơn lọc)` : `(tổng ${stats.allOrdersCount})`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span className="flex items-center gap-1.5">
              <span>Tổng lợi nhuận gộp</span>
              {isFiltered && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                  Bộ lọc
                </span>
              )}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg md:text-xl font-bold text-emerald-700">
            {formatCurrency(stats.totalProfit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tỷ suất LN: {stats.totalRevenue > 0 ? Math.round((stats.totalProfit / stats.totalRevenue) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Giá trị TB đơn (AOV)</span>
            <Tag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900">
            {formatCurrency(stats.averageOrderValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Trung bình mỗi khách chi tiêu</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1.5">
            <span>Đơn đã hủy / Hoàn trả</span>
            <Ban className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg md:text-xl font-bold text-rose-600">
            {stats.cancelledCount} <span className="text-xs font-normal text-slate-500">đơn</span>
          </div>
          <div className="text-[11px] text-rose-500 mt-1">
            {isFiltered ? 'Trong danh sách kết quả lọc' : 'Đã hoàn trả số lượng vào kho'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo Mã hóa đơn (HD-...), Tên khách, Số điện thoại, Tên sản phẩm, Thu ngân..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-900 border border-slate-200 rounded-lg focus:border-[#0B63E5] focus:ring-1 focus:ring-[#0B63E5] outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs flex-wrap">
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B63E5] text-xs cursor-pointer"
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
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 border border-slate-200 rounded-lg">
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B63E5] text-xs cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COMPLETED">✅ Hoàn thành</option>
              <option value="CANCELLED">❌ Đã hủy</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B63E5] text-xs cursor-pointer"
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="CASH">💵 Tiền mặt</option>
              <option value="TRANSFER">📱 Chuyển khoản QR</option>
              <option value="CARD">💳 Quẹt thẻ</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B63E5] text-xs cursor-pointer"
            >
              <option value="NEWEST">Thời gian giảm dần (Mới nhất trước)</option>
              <option value="OLDEST">Thời gian tăng dần (Cũ nhất trước)</option>
              <option value="AMOUNT_DESC">Giá trị giảm dần (Cao nhất)</option>
              <option value="AMOUNT_ASC">Giá trị tăng dần (Thấp nhất)</option>
            </select>

            {/* Clear Filters Button */}
            {(statusFilter !== 'ALL' || paymentFilter !== 'ALL' || dateFilter !== 'ALL' || searchTerm.trim() !== '' || customStartDate !== '' || customEndDate !== '') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setPaymentFilter('ALL');
                  setDateFilter('ALL');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold border border-rose-200 rounded-lg text-xs cursor-pointer transition-colors"
                title="Xóa tất cả bộ lọc"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc ({filteredOrders.length}/{orders.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 whitespace-nowrap">Mã Hóa Đơn</th>
                <th className="py-3 px-4 whitespace-nowrap">Thời Gian</th>
                <th className="py-3 px-4 min-w-[150px]">Khách Hàng</th>
                <th className="py-3 px-4 min-w-[160px]">Mặt Hàng Mua</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Khách Đã Trả</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Lợi Nhuận</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Thanh Toán</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Trạng Thái</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy hóa đơn nào phù hợp!</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi bộ lọc hoặc tạo đơn bán hàng mới qua màn hình POS.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isCompleted = order.status === 'COMPLETED';
                  const totalItemsCount = order.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !isCompleted ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Order Code */}
                      <td className="py-3 px-4 font-bold text-[#0B63E5]">
                        <div className="flex items-center gap-1.5">
                          <span>{order.code}</span>
                          {order.note && (
                            <span
                              title={`Ghi chú: ${order.note}`}
                              className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          Thu ngân: {order.cashier || 'Admin'}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(order.created_at)}</span>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{order.customer_name || 'Khách lẻ'}</span>
                        </div>
                        {order.phone && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{order.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Items summary */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 truncate" title={order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}>
                          {order.items[0]?.name || 'Không có sản phẩm'}
                          {order.items.length > 1 && (
                            <span className="text-[10px] font-semibold text-slate-500 ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded">
                              +{order.items.length - 1} món khác
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Tổng số lượng: <strong className="text-slate-700">{totalItemsCount}</strong> món
                        </div>
                      </td>

                      {/* Final Amount */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900">
                          {formatCurrency(order.final_amount)}
                        </div>
                        {order.discount > 0 && (
                          <div className="text-[10px] text-rose-500">
                            Giảm: -{formatCurrency(order.discount)}
                          </div>
                        )}
                      </td>

                      {/* Profit */}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                        {isCompleted ? (
                          formatCurrency(order.profit)
                        ) : (
                          <span className="text-slate-400 font-normal">--</span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {order.payment_method === 'CASH' && (
                          <span className="inline-flex items-center whitespace-nowrap gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium text-[11px]">
                            <Banknote className="w-3 h-3" /> Tiền mặt
                          </span>
                        )}
                        {order.payment_method === 'TRANSFER' && (
                          <span className="inline-flex items-center whitespace-nowrap gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#0B63E5] font-medium text-[11px]">
                            <QrCode className="w-3 h-3" /> Chuyển khoản
                          </span>
                        )}
                        {order.payment_method === 'CARD' && (
                          <span className="inline-flex items-center whitespace-nowrap gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[11px]">
                            <CreditCard className="w-3 h-3" /> Quẹt thẻ
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center whitespace-nowrap gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center whitespace-nowrap gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[10px]">
                            <XCircle className="w-3 h-3" /> Đã hủy
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Export PDF Button */}
                          <button
                            onClick={() => {
                              setSelectedPdfOrder(order);
                              setIsPdfModalOpen(true);
                            }}
                            title="Xuất hóa đơn PDF & In ấn (K80 / A4)"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Print Receipt */}
                          <button
                            onClick={() => openOrderReceipt(order)}
                            title="In lại hóa đơn K80"
                            className="p-1.5 text-slate-500 hover:text-[#0B63E5] hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Edit Invoice Button */}
                          {currentUser.permissions.canEditInvoices && (
                            <button
                              onClick={() => handleOpenEditModal(order)}
                              title="Cập nhật / Sửa thông tin hóa đơn"
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel / Restore button */}
                          {currentUser.permissions.canCancelInvoices && (
                            isCompleted ? (
                              <button
                                onClick={() => {
                                  setCancelingOrder(order);
                                  setCancelReason('Khách đổi ý / Trả hàng');
                                  setReturnStockOnCancel(true);
                                }}
                                title="Hủy hóa đơn & Hoàn trả kho"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => restoreOrder(order.id)}
                                title="Khôi phục hóa đơn"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {/* Delete permanently (Admin Only) */}
                          {currentUser.permissions.canDeleteInvoices && (
                            <button
                              onClick={() => {
                                setDeletingOrderId(order.id);
                                setReturnStockOnDelete(order.status === 'COMPLETED');
                              }}
                              title="Xóa vĩnh viễn (Chỉ Admin)"
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-all cursor-pointer"
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

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          itemLabel="hóa đơn"
        />
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

      {/* Voice Assistant POS / Stock In Modal */}
      <VoiceActionModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialMode="POS_ORDER"
      />
    </div>
  );
};
