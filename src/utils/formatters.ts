import * as XLSX from 'xlsx';
import { Product, Order, InventoryAudit, Supplier, Customer } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0).replace('₫', 'đ');
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val || 0);
};

export const formatShortCurrency = (amount: number): string => {
  const abs = Math.abs(amount || 0);
  if (abs >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(2).replace('.00', '') + ' tỷ';
  }
  if (abs >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  if (abs >= 1_000) {
    return (amount / 1_000).toFixed(0) + 'K';
  }
  return formatNumber(amount) + ' đ';
};

/**
 * Parse any date/time format (Vietnamese DD/MM/YYYY, ISO YYYY-MM-DD, Date object, etc.)
 * into a unix millisecond timestamp without timezone offset distortion or +7 shifts.
 */
export const parseDateToTimestamp = (dateInput?: string | Date | number | null): number => {
  if (!dateInput && dateInput !== 0) return 0;
  if (typeof dateInput === 'number') {
    // If it's an Excel serial date (e.g. 45292.818), convert to unix timestamp
    if (dateInput > 1000 && dateInput < 100000) {
      return Math.round((dateInput - 25569) * 86400 * 1000);
    }
    return dateInput;
  }
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? 0 : dateInput.getTime();

  let str = String(dateInput).trim();
  if (!str) return 0;

  // Check if string is a pure numeric Excel serial date like "45658.927..."
  const numVal = Number(str);
  if (!isNaN(numVal) && numVal > 1000 && numVal < 100000) {
    return Math.round((numVal - 25569) * 86400 * 1000);
  }

  // Remove trailing timezone indicators like +07:00, +0700, +07, GMT+7, UTC, Z to avoid artificial timezone shifts
  str = str.replace(/(?:\+07:?00|\+07|GMT\+7|UTC\+7|\+08:?00|\+09:?00|Z)$/i, '').trim();

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY (with optional HH:mm:ss or HH:mm)
  // e.g. 30/08/2026 20:55:26, 30/08/2026, 30-08-2026 09:15
  const vnMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10) - 1;
    const year = parseInt(vnMatch[3], 10);
    const hour = vnMatch[4] ? parseInt(vnMatch[4], 10) : 0;
    const minute = vnMatch[5] ? parseInt(vnMatch[5], 10) : 0;
    const second = vnMatch[6] ? parseInt(vnMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // Pattern 2: Time first, then date: HH:mm:ss DD/MM/YYYY
  const timeFirstMatch = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?[,\s]+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (timeFirstMatch) {
    const hour = parseInt(timeFirstMatch[1], 10);
    const minute = parseInt(timeFirstMatch[2], 10);
    const second = timeFirstMatch[3] ? parseInt(timeFirstMatch[3], 10) : 0;
    const day = parseInt(timeFirstMatch[4], 10);
    const month = parseInt(timeFirstMatch[5], 10) - 1;
    const year = parseInt(timeFirstMatch[6], 10);
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // Pattern 3: YYYY-MM-DD or YYYY/MM/DD (with optional HH:mm:ss or HH:mm)
  // e.g. 2026-08-30 09:15:00, 2026-08-30T09:15:00, 2026-08-30
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const parsed = Date.parse(str);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format any date/time into clean, deterministic Vietnamese format (DD/MM/YYYY HH:mm:ss)
 * No "+7" or timezone offset string appended!
 */
export const formatDateTime = (dateInput?: string | Date | number | null): string => {
  if (!dateInput && dateInput !== 0) return '';

  if (typeof dateInput === 'number' && dateInput > 1000 && dateInput < 100000) {
    const ts = Math.round((dateInput - 25569) * 86400 * 1000);
    return formatDateTime(ts);
  }

  if (typeof dateInput === 'string') {
    let s = dateInput.trim();
    if (!s) return '';

    const numVal = Number(s);
    if (!isNaN(numVal) && numVal > 1000 && numVal < 100000) {
      const ts = Math.round((numVal - 25569) * 86400 * 1000);
      return formatDateTime(ts);
    }

    // Strip any timezone tags like +07:00, +07, GMT+7
    s = s.replace(/(?:\+07:?00|\+07|GMT\+7|UTC\+7|\+08:?00|\+09:?00|Z)$/i, '').trim();

    // If string is already in standard DD/MM/YYYY HH:mm:ss or DD/MM/YYYY HH:mm
    const vnMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (vnMatch) {
      const dd = vnMatch[1].padStart(2, '0');
      const mm = vnMatch[2].padStart(2, '0');
      const yyyy = vnMatch[3];
      const hh = vnMatch[4] ? vnMatch[4].padStart(2, '0') : '00';
      const min = vnMatch[5] ? vnMatch[5].padStart(2, '0') : '00';
      const ss = vnMatch[6] ? vnMatch[6].padStart(2, '0') : (vnMatch[4] ? '00' : '');
      return ss ? `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}` : (vnMatch[4] ? `${dd}/${mm}/${yyyy} ${hh}:${min}:00` : `${dd}/${mm}/${yyyy}`);
    }

    // If string is YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
    const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (isoMatch) {
      const yyyy = isoMatch[1];
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      if (isoMatch[4] && isoMatch[5]) {
        const hh = isoMatch[4].padStart(2, '0');
        const min = isoMatch[5].padStart(2, '0');
        const ss = isoMatch[6] ? isoMatch[6].padStart(2, '0') : '00';
        return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
      }
      return `${dd}/${mm}/${yyyy}`;
    }
  }

  const ts = parseDateToTimestamp(dateInput);
  if (!ts) return String(dateInput || '');

  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

/**
 * Format date only (DD/MM/YYYY) in Vietnamese format
 */
export const formatDate = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    let s = dateInput.trim();
    if (!s) return '';
    s = s.replace(/(?:\+07:?00|\+07|GMT\+7|UTC\+7|\+08:?00|\+09:?00|Z)$/i, '').trim();

    const vnMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (vnMatch) {
      const dd = vnMatch[1].padStart(2, '0');
      const mm = vnMatch[2].padStart(2, '0');
      const yyyy = vnMatch[3];
      return `${dd}/${mm}/${yyyy}`;
    }

    const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      const yyyy = isoMatch[1];
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      return `${dd}/${mm}/${yyyy}`;
    }
  }

  const ts = parseDateToTimestamp(dateInput);
  if (!ts) return String(dateInput || '');

  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Helper to get current Vietnamese datetime string: DD/MM/YYYY HH:mm:ss
 */
export const getCurrentVietnameseDateTime = (): string => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
};

/**
 * Helper to get current Vietnamese date string: DD/MM/YYYY
 */
export const getCurrentVietnameseDate = (): string => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/**
 * Generates VietQR Dynamic QR URL
 */
export const getVietQRUrl = (
  bankId: string = 'ICB',
  accountNo: string = '106877069794',
  template: string = 'compact2',
  amount: number = 0,
  description: string = 'THANH TOAN DON HANG',
  accountName: string = 'PHAN ANH TAI',
  cacheBuster?: number | string
): string => {
  const finalBankId = (bankId && bankId.trim()) || 'ICB';
  const finalAccountNo = (accountNo && accountNo.trim().replace(/\s+/g, '')) || '106877069794';
  const finalTemplate = (template && template.trim()) || 'compact2';
  const cleanDesc = encodeURIComponent((description || 'THANH TOAN').replace(/[^a-zA-Z0-9 ]/g, ' ').trim());
  const cleanAccName = encodeURIComponent((accountName || 'CHU TAI KHOAN').replace(/[^a-zA-Z0-9 ]/g, ' ').trim().toUpperCase());
  
  const params = [`amount=${Math.round(amount || 0)}`, `addInfo=${cleanDesc}`, `accountName=${cleanAccName}`];
  if (cacheBuster) {
    params.push(`t=${cacheBuster}`);
  }
  return `https://img.vietqr.io/image/${finalBankId}-${finalAccountNo}-${finalTemplate}.png?${params.join('&')}`;
};

/**
 * Export array of data objects to Excel (.xlsx) file
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Export multiple datasets into one full backup workbook
 */
export const exportFullSystemBackup = (
  products: Product[],
  orders: Order[],
  audits: InventoryAudit[],
  cashbook: any[],
  suppliers: Supplier[] = [],
  customers: Customer[] = []
) => {
  const workbook = XLSX.utils.book_new();

  // Products Sheet
  const prodData = products.map((p) => ({
    'Mã SKU': p.sku,
    'Mã Vạch Barcode': p.barcode,
    'Tên Hàng Hóa': p.name,
    'Danh Mục': p.category,
    'Đơn Vị Tính': p.unit,
    'Giá Vốn (đ)': p.cost_price,
    'Giá Bán Lẻ (đ)': p.selling_price,
    'Tồn Kho Hiện Tại': p.stock,
    'Tồn Tối Thiểu': p.min_stock,
    'Trạng Thái': p.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Ngừng kinh doanh',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(prodData), 'Danh_Sach_Hang_Hoa');

  // Customers Sheet
  const custData = customers.map((c) => ({
    'Mã khách hàng': c.code,
    'Tên khách hàng': c.name,
    'Điện thoại': c.phone,
    'Email': c.email || '',
    'Địa chỉ': c.address || '',
    'Khu vực': c.district_city || '',
    'Phường / Xã': c.ward || '',
    'Giới tính': c.gender || '',
    'Mã số thuế': c.tax_code || '',
    'Số CMND / CCCD': c.id_card || '',
    'Nhóm khách hàng': c.group || '',
    'Loại khách': c.customer_type || 'Cá nhân',
    'Nợ hiện tại (đ)': c.debt,
    'Tổng mua (đ)': c.total_purchased,
    'Ghi chú': c.note || '',
    'Trạng thái': (c.status === 1 || c.status === 'ACTIVE') ? 'Đang hoạt động' : 'Ngừng hoạt động',
    'Chi nhánh': c.branch || '',
    'Người tạo': c.created_by || '',
    'Ngày tạo': c.created_at || '',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(custData), 'Danh_Sach_Khach_Hang');

  // Suppliers Sheet
  const supData = suppliers.map((s) => ({
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
    'Công ty': s.company || '',
    'Ghi chú': s.note || '',
    'Trạng thái': s.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch',
    'Người tạo': s.created_by || '',
    'Ngày tạo': s.created_at || '',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(supData), 'Danh_Sach_Nha_Cung_Cap');

  // Orders Sheet
  const orderData = orders.map((o) => ({
    'Mã Hóa Đơn': o.code,
    'Thời Gian': o.created_at,
    'Khách Hàng': o.customer_name,
    'Số Điện Thoại': o.phone,
    'Tổng Tiền Hàng (đ)': o.total,
    'Giảm Giá (đ)': o.discount,
    'Thực Thu (đ)': o.final_amount,
    'Tổng Giá Vốn (đ)': o.total_cost,
    'Lợi Nhuận Gộp (đ)': o.profit,
    'Phương Thức': o.payment_method,
    'Thu Ngân': o.cashier,
    'Chi Nhánh': o.branch,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(orderData), 'Lich_Su_Don_Hang');

  // Audits Sheet
  const auditData = audits.flatMap((a) =>
    a.items.map((i) => ({
      'Mã Phiếu Kiểm': a.code,
      'Ngày Kiểm': a.date,
      'Người Kiểm': a.auditor,
      'Mã SKU': i.sku,
      'Tên Sản Phẩm': i.name,
      'ĐVT': i.unit,
      'Tồn Hệ Thống': i.system_stock,
      'Thực Tế Đếm': i.actual_stock,
      'Chênh Lệch': i.diff,
      'Giá Trị Lệch (đ)': i.diff_value,
      'Lý Do': i.reason,
      'Trạng Thái': a.status === 'BALANCED' ? 'Đã cân bằng kho' : 'Phiếu tạm',
    }))
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(auditData), 'So_Kiem_Ke_Kho');

  // Cashbook Sheet
  const cashData = cashbook.map((c) => ({
    'Mã Phiếu': c.code,
    'Loại Phiếu': c.type === 'IN' ? 'Phiếu Thu' : 'Phiếu Chi',
    'Số Tiền (đ)': c.amount,
    'Hạng Mục': c.category,
    'Ghi Chú': c.note,
    'Thời Gian': c.created_at,
    'Mã Chứng Từ Gốc': c.ref_code || '',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(cashData), 'So_Quy_Tien_Mat');

  XLSX.writeFile(workbook, `OmniERP_Sao_Luu_Toan_Bo_He_Thong_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Generate Excel Template for Supplier Import (KiotViet Standard format)
 */
export const downloadSupplierTemplate = () => {
  const sampleSuppliers = [
    {
      'Mã nhà cung cấp (*)': 'NCC000001',
      'Tên nhà cung cấp (*)': 'NPP Kim Bình',
      'Email': 'kimbinh.dist@gmail.com',
      'Điện thoại': '0904466138',
      'Địa chỉ': 'Ngõ 12 Quang Trung',
      'Khu vực': 'Nghệ An - TP Vinh',
      'Phường / Xã': 'Quang Trung',
      'Tổng mua': 0,
      'Nợ cần trả': 0,
      'Mã số thuế': '2901889922',
      'Số CMND': '187654321',
      'Ghi chú': 'Đại lý phân phối tổng hợp',
      'Nhóm nhà cung cấp': 'Nhà phân phối tổng hợp',
      'Trạng thái': 1,
      'Công ty': 'Nhà phân phối Kim Bình Nghệ An',
      'Người tạo': 'Phan Minh',
      'Ngày tạo': '2026-08-10',
    },
    {
      'Mã nhà cung cấp (*)': 'NCC000002',
      'Tên nhà cung cấp (*)': 'Hải Anh (Tuấn)',
      'Email': 'haianhtuan@gmail.com',
      'Điện thoại': '0974353839',
      'Địa chỉ': 'Vinh - Nghệ An',
      'Khu vực': 'Nghệ An - TP Vinh',
      'Phường / Xã': 'Lê Lợi',
      'Tổng mua': 0,
      'Nợ cần trả': -2160000,
      'Mã số thuế': '',
      'Số CMND': '',
      'Ghi chú': 'Đã thanh toán trước thừa 2.160.000đ',
      'Nhóm nhà cung cấp': 'Điện máy & Thiết bị',
      'Trạng thái': 1,
      'Công ty': 'Hải Anh Thiết Bị',
      'Người tạo': 'Phan Minh',
      'Ngày tạo': '2026-08-12',
    },
    {
      'Mã nhà cung cấp (*)': 'NCC000003',
      'Tên nhà cung cấp (*)': 'Hà An Phát',
      'Email': 'haanphat.corp@gmail.com',
      'Điện thoại': '0901796288',
      'Địa chỉ': 'Vinh',
      'Khu vực': 'Nghệ An - TP Vinh',
      'Phường / Xã': 'Hà Huy Tập',
      'Tổng mua': 0,
      'Nợ cần trả': -2020000,
      'Mã số thuế': '',
      'Số CMND': '',
      'Ghi chú': 'Đã cọc tiền hàng 2.020.000đ',
      'Nhóm nhà cung cấp': 'Gia dụng & Đời sống',
      'Trạng thái': 1,
      'Công ty': 'Công ty CP Hà An Phát',
      'Người tạo': 'Phan Minh',
      'Ngày tạo': '2026-08-14',
    },
    {
      'Mã nhà cung cấp (*)': 'NCC000004',
      'Tên nhà cung cấp (*)': 'NPP Hải Anh',
      'Email': 'haianhnghean@gmail.com',
      'Điện thoại': '0982345678',
      'Địa chỉ': 'TP Vinh Nghệ An',
      'Khu vực': 'Nghệ An - TP Vinh',
      'Phường / Xã': 'Trường Thi',
      'Tổng mua': 2100000,
      'Nợ cần trả': 140000,
      'Mã số thuế': '2901998877',
      'Số CMND': '',
      'Ghi chú': 'Nợ phát sinh đơn hàng ngày 28/08',
      'Nhóm nhà cung cấp': 'Mỹ phẩm & Tiêu dùng',
      'Trạng thái': 1,
      'Công ty': 'Nhà phân phối Hải Anh Miền Trung',
      'Người tạo': 'Phan Minh',
      'Ngày tạo': '2026-08-18',
    },
  ];

  exportToExcel(sampleSuppliers, 'Mau_nhap_nha_cung_cap_chuan_KiotViet', 'NhaCungCap');
};

/**
 * Generate Excel Template for Customer Import (Exact format matching standard retail ERP / KiotViet)
 */
export const downloadCustomerTemplate = () => {
  const sampleCustomers = [
    {
      'Loại khách': 'Cá nhân',
      'Chi nhánh': 'Cửa hàng Ngân Sơn',
      'Mã khách hàng': 'KH0000001',
      'Tên khách hàng (*)': 'Phan Minh Tuấn',
      'Điện thoại (*)': '0911834949',
      'Địa chỉ': 'Thạch Linh, TP Hà Tĩnh',
      'Khu vực': 'Hà Tĩnh - TP Hà Tĩnh',
      'Phường / Xã': 'Thạch Linh',
      'Giới tính': 'Nam',
      'Mã số thuế': '3001169526',
      'Số CMND / CCCD': '042095001234',
      'Email': 'tuan.phan@gmail.com',
      'Nhóm khách hàng': 'Khách quen',
      'Người tạo': 'Phan Minh',
      'Ngày tạo': '2026-08-15',
      'Nợ hiện tại': 0,
      'Tổng mua': 294000,
      'Ghi chú': 'Khách hàng thân thiết',
      'Trạng thái': 1,
    },
    {
      'Loại khách': 'Công ty',
      'Chi nhánh': 'Cửa hàng Ngân Sơn',
      'Mã khách hàng': 'KH0000002',
      'Tên khách hàng (*)': 'Công ty TNHH Thương Mại Á Châu',
      'Điện thoại (*)': '0988223344',
      'Địa chỉ': '318 Vũ Quang, TP Hà Tĩnh',
      'Khu vực': 'Hà Tĩnh - TP Hà Tĩnh',
      'Phường / Xã': 'Thạch Linh',
      'Giới tính': '',
      'Mã số thuế': '3001234567',
      'Số CMND / CCCD': '',
      'Email': 'achau.corp@gmail.com',
      'Nhóm khách hàng': 'Khách sỉ / Doanh nghiệp',
      'Người tạo': 'Phan Anh Tài',
      'Ngày tạo': '2026-08-18',
      'Nợ hiện tại': 1200000,
      'Tổng mua': 15800000,
      'Ghi chú': 'Đối tác thanh toán chuyển khoản cuối tháng',
      'Trạng thái': 1,
    },
    {
      'Loại khách': 'Cá nhân',
      'Chi nhánh': 'Cửa hàng Ngân Sơn',
      'Mã khách hàng': 'KH0000003',
      'Tên khách hàng (*)': 'Chị Hoa',
      'Điện thoại (*)': '0977889900',
      'Địa chỉ': 'Vĩnh Sơn, Hướng Hóa, Quảng Trị',
      'Khu vực': 'Quảng Trị - Hướng Hóa',
      'Phường / Xã': 'Vĩnh Sơn',
      'Giới tính': 'Nữ',
      'Mã số thuế': '',
      'Số CMND / CCCD': '',
      'Email': '',
      'Nhóm khách hàng': 'Khách lẻ',
      'Người tạo': 'Nguyễn Thị Ngân',
      'Ngày tạo': '2026-08-20',
      'Nợ hiện tại': 320000,
      'Tổng mua': 750000,
      'Ghi chú': 'Mua hàng gia dụng',
      'Trạng thái': 1,
    },
  ];

  exportToExcel(sampleCustomers, 'Mau_nhap_khach_hang_chuan_ERP', 'KhachHang');
};

/**
 * Generate Excel Template for Product Import
 */
export const downloadProductTemplate = () => {
  const sampleData = [
    {
      'Mã SKU (*)': 'SP-SAMPLE-01',
      'Mã Barcode': '893600100999',
      'Tên Hàng Hóa (*)': 'Nước ngọt có gas Coca-Cola 330ml',
      'Danh Mục': 'Thực phẩm & Tiêu dùng',
      'Đơn Vị Tính': 'Lon',
      'Giá Vốn': 8000,
      'Giá Bán Lẻ (*)': 12000,
      'Tồn Kho Ban Đầu': 120,
      'Tồn Tối Thiểu': 24,
    },
    {
      'Mã SKU (*)': 'SP-SAMPLE-02',
      'Mã Barcode': '893600100998',
      'Tên Hàng Hóa (*)': 'Bình giữ nhiệt Lock&Lock 500ml',
      'Danh Mục': 'Gia dụng & Đời sống',
      'Đơn Vị Tính': 'Cái',
      'Giá Vốn': 180000,
      'Giá Bán Lẻ (*)': 299000,
      'Tồn Kho Ban Đầu': 35,
      'Tồn Tối Thiểu': 5,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Hang_Hoa');
  XLSX.writeFile(wb, 'Mau_Nhap_Hang_Hoa_OmniERP.xlsx');
};

/**
 * Generate Excel Template for Invoice Import (KiotViet Standard format)
 */
export const downloadInvoiceTemplate = () => {
  const sampleInvoices = [
    {
      'Mã hóa đơn (*)': 'HD202608300001',
      'Thời gian (*)': '2026-08-30 09:15:00',
      'Tên khách hàng': 'Nguyễn Văn Hùng',
      'Điện thoại': '0912345678',
      'Mã hàng / SKU': 'SP-SAMPLE-01',
      'Tên hàng': 'Nước ngọt có gas Coca-Cola 330ml',
      'ĐVT': 'Lon',
      'Số lượng': 10,
      'Đơn giá': 12000,
      'Giá vốn': 8000,
      'Tổng tiền hàng': 120000,
      'Giảm giá': 10000,
      'Khách cần trả / Thực thu (*)': 110000,
      'Phương thức thanh toán': 'Tiền mặt',
      'Thu ngân': 'Nguyễn Mai Chi',
      'Chi nhánh': 'Cửa hàng Ngân Sơn',
      'Trạng thái': 'Hoàn thành',
      'Ghi chú': 'Khách quen chiết khấu 10k',
    },
    {
      'Mã hóa đơn (*)': 'HD202608300002',
      'Thời gian (*)': '2026-08-30 10:30:00',
      'Tên khách hàng': 'Trần Thị Lan',
      'Điện thoại': '0988776655',
      'Mã hàng / SKU': 'SP-SAMPLE-02',
      'Tên hàng': 'Bình giữ nhiệt Lock&Lock 500ml',
      'ĐVT': 'Cái',
      'Số lượng': 2,
      'Đơn giá': 299000,
      'Giá vốn': 180000,
      'Tổng tiền hàng': 598000,
      'Giảm giá': 0,
      'Khách cần trả / Thực thu (*)': 598000,
      'Phương thức thanh toán': 'Chuyển khoản QR',
      'Thu ngân': 'Phan Minh',
      'Chi nhánh': 'Cửa hàng Ngân Sơn',
      'Trạng thái': 'Hoàn thành',
      'Ghi chú': 'Chuyển khoản quét QR MBBank',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleInvoices);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'HoaDonBanHang');
  XLSX.writeFile(wb, 'Mau_Nhap_Hoa_Don_KiotViet_OmniERP.xlsx');
};

/**
 * Universal date parser for Vietnamese/ISO/Locale timestamp strings
 */
export const parseOrderDate = (created_at?: string | Date): {
  date: Date;
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  timestamp: number;
  formattedDisplay: string;
} => {
  let orderDate = new Date();
  if (created_at) {
    if (created_at instanceof Date) {
      orderDate = created_at;
    } else {
      const str = String(created_at).trim();
      // Check format like "HH:mm:ss DD/MM/YYYY" or "DD/MM/YYYY HH:mm:ss" or "DD/MM/YYYY"
      if (str.includes('/')) {
        const parts = str.split(' ');
        let datePart = '';
        let timePart = '';
        if (parts.length >= 2) {
          if (parts[0].includes('/')) {
            datePart = parts[0];
            timePart = parts[1];
          } else {
            timePart = parts[0];
            datePart = parts[1];
          }
        } else {
          datePart = str;
        }

        const [d, m, y] = datePart.split('/').map(Number);
        let [h, min, s] = [0, 0, 0];
        if (timePart && timePart.includes(':')) {
          const tParts = timePart.split(':').map(Number);
          h = tParts[0] || 0;
          min = tParts[1] || 0;
          s = tParts[2] || 0;
        }
        if (y && m && d) {
          orderDate = new Date(y, m - 1, d, h, min, s);
        }
      } else {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          orderDate = parsed;
        }
      }
    }
  }

  return {
    date: orderDate,
    year: orderDate.getFullYear(),
    month: orderDate.getMonth() + 1,
    day: orderDate.getDate(),
    dayOfWeek: orderDate.getDay(), // 0 = Sunday, 1 = Monday ... 6 = Saturday
    timestamp: orderDate.getTime(),
    formattedDisplay: orderDate.toLocaleDateString('vi-VN'),
  };
};

/**
 * Helper to clean Vietnamese and international currency/number strings:
 * Examples: "150.000 đ" -> 150000, "-2.160.000" -> -2160000, "(2,160,000)" -> -2160000, "1,500,000" -> 1500000, "25.5" -> 25.5, "150k" -> 150000
 */
export const parseCleanNumber = (val: any, defaultVal: number = 0): number => {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;

  let str = String(val).trim().toLowerCase();
  if (!str) return defaultVal;

  // Check negative sign
  const isNegative = str.startsWith('-') || str.startsWith('(') || str.endsWith('-');
  str = str.replace(/[()]/g, '').trim();

  // Handle shorthand k / m (e.g. 150k -> 150000, 1.5m -> 1500000)
  if (str.endsWith('k')) {
    const n = parseFloat(str.slice(0, -1).replace(/,/g, '.').trim());
    const res = isNaN(n) ? defaultVal : n * 1000;
    return isNegative ? -Math.abs(res) : res;
  }
  if (str.endsWith('m') || str.endsWith('tr') || str.endsWith('trieu')) {
    const n = parseFloat(str.replace(/(m|tr|trieu)/g, '').replace(/,/g, '.').trim());
    const res = isNaN(n) ? defaultVal : n * 1000000;
    return isNegative ? -Math.abs(res) : res;
  }

  // Remove currency symbols & spaces
  str = str.replace(/[₫đvnd$\s]/g, '');

  let cleanNumStr = str.replace(/^-/, '').replace(/-$/, '').trim();

  if (cleanNumStr.includes('.') && cleanNumStr.includes(',')) {
    if (cleanNumStr.lastIndexOf(',') > cleanNumStr.lastIndexOf('.')) {
      cleanNumStr = cleanNumStr.replace(/\./g, '').replace(',', '.');
    } else {
      cleanNumStr = cleanNumStr.replace(/,/g, '');
    }
  } else if (cleanNumStr.includes('.')) {
    const parts = cleanNumStr.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleanNumStr = cleanNumStr.replace(/\./g, '');
    }
  } else if (cleanNumStr.includes(',')) {
    const parts = cleanNumStr.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleanNumStr = cleanNumStr.replace(/,/g, '');
    } else {
      cleanNumStr = cleanNumStr.replace(',', '.');
    }
  }

  const num = parseFloat(cleanNumStr);
  if (isNaN(num)) return defaultVal;
  return isNegative ? -Math.abs(num) : num;
};

/**
 * Remove Vietnamese accents and special characters for flexible header matching
 */
export const cleanTextForMatch = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Multi-priority header search helper
 * First attempts exact key match, then prefix match, then substring match
 */
export const findHeaderValue = (row: Record<string, any>, candidateKeywords: string[]): any => {
  if (!row || typeof row !== 'object') return undefined;
  const keys = Object.keys(row);

  // 1. Pass 1: Exact matches
  for (const kw of candidateKeywords) {
    const target = cleanTextForMatch(kw);
    for (const key of keys) {
      const cleanKey = cleanTextForMatch(key);
      if (cleanKey === target) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }

  // 2. Pass 2: Prefix / startsWith matches (for keywords with length >= 3)
  for (const kw of candidateKeywords) {
    const target = cleanTextForMatch(kw);
    if (target.length < 3) continue;
    for (const key of keys) {
      const cleanKey = cleanTextForMatch(key);
      if (cleanKey.startsWith(target)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }

  // 3. Pass 3: Substring matches (for specific longer keywords >= 4 chars to prevent false positives)
  for (const kw of candidateKeywords) {
    const target = cleanTextForMatch(kw);
    if (target.length < 4) continue;
    for (const key of keys) {
      const cleanKey = cleanTextForMatch(key);
      if (cleanKey.includes(target)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }

  return undefined;
};

/**
 * Detect whether parsed headers belong to Invoices, Suppliers, Customers, or Products
 */
export const detectExcelDataType = (headers: string[]): 'INVOICES' | 'SUPPLIERS' | 'CUSTOMERS' | 'PRODUCTS' | 'CASHBOOK' => {
  let invoiceScore = 0;
  let supplierScore = 0;
  let customerScore = 0;
  let productScore = 0;
  let cashbookScore = 0;

  for (const h of headers) {
    const clean = cleanTextForMatch(h);
    if (!clean) continue;

    // Cashbook indicators
    if (
      clean.includes('maphieu') ||
      clean.includes('loaithuchi') ||
      clean.includes('thuchi') ||
      clean.includes('nguoinop') ||
      clean.includes('nguoinhan') ||
      clean.includes('giatri') ||
      clean.includes('soquy') ||
      clean.includes('phieuthu') ||
      clean.includes('phieuchi')
    ) {
      cashbookScore += 8;
    }

    // Invoice indicators
    if (
      clean.includes('mahoadon') ||
      clean.includes('mahd') ||
      clean.includes('sohoadon') ||
      clean.includes('madonhang') ||
      clean.includes('thucthu') ||
      clean.includes('khachcantra') ||
      clean.includes('tongtienhang') ||
      clean.includes('phuongthucthanhtoan') ||
      clean.includes('thungan') ||
      clean.includes('hoadon') ||
      clean.includes('ngayban') ||
      clean.includes('thoigianban')
    ) {
      invoiceScore += 6;
    }

    // Customer indicators
    if (
      clean.includes('makhachhang') ||
      clean.includes('makhach') ||
      clean.includes('makh') ||
      clean.includes('loaikhach') ||
      clean.includes('nhomkhach') ||
      clean.includes('nhomkhachhang') ||
      clean.includes('nohientai') ||
      (clean.includes('tenkhach') && !clean.includes('hoadon')) ||
      (clean.includes('khachhang') && !clean.includes('hoadon'))
    ) {
      customerScore += 6;
    }

    // Supplier indicators
    if (
      clean.includes('nhacungcap') ||
      clean.includes('ncc') ||
      clean.includes('nocantra') ||
      clean.includes('nocan') ||
      clean.includes('duno') ||
      clean.includes('nhomnha') ||
      clean.includes('nhomncc') ||
      clean.includes('doitac') ||
      clean.startsWith('manha') ||
      clean.startsWith('tennha')
    ) {
      supplierScore += 5;
    }

    // Product indicators
    if (
      clean.includes('sku') ||
      clean.includes('barcode') ||
      clean.includes('mavach') ||
      clean.includes('giaban') ||
      clean.includes('giavon') ||
      clean.includes('gianhap') ||
      clean.includes('tonkho') ||
      clean.includes('slton') ||
      clean.includes('donvitinh') ||
      clean.includes('dvt') ||
      clean.includes('danhmuc') ||
      clean.includes('tontoithieu') ||
      clean.includes('loaihang') ||
      clean.includes('nhomhang') ||
      clean.startsWith('mahang') ||
      clean.startsWith('tenhang')
    ) {
      productScore += 5;
    }
  }

  if (cashbookScore > invoiceScore && cashbookScore > supplierScore && cashbookScore > customerScore && cashbookScore > productScore) return 'CASHBOOK';
  if (invoiceScore > supplierScore && invoiceScore > customerScore && invoiceScore > productScore) return 'INVOICES';
  if (customerScore > supplierScore && customerScore > invoiceScore && customerScore > productScore) return 'CUSTOMERS';
  if (supplierScore > productScore) return 'SUPPLIERS';
  return 'PRODUCTS';
};

/**
 * Download standard Excel template for Cashbook import
 */
export const downloadCashbookTemplate = (): void => {
  const sampleData = [
    {
      'Mã phiếu': 'PT20260904-001',
      'Thời gian': '04/09/2026 09:30:00',
      'Loại thu chi': 'Phiếu thu Tiền khách trả',
      'Người nộp/nhận': 'Anh Tuấn',
      'Giá trị': 250000,
      'Hạng mục': 'Thu tiền bán hàng POS',
      'Nội dung / Diễn giải': 'Thu tiền mặt theo hóa đơn HD001',
      'Chứng từ kèm theo': 'HD001',
      'Chi nhánh': '318 Vũ Quang',
    },
    {
      'Mã phiếu': 'PC20260904-001',
      'Thời gian': '04/09/2026 10:15:00',
      'Loại thu chi': 'Phiếu chi Tiền trả khách',
      'Người nộp/nhận': 'Chị Hoa',
      'Giá trị': 50000,
      'Hạng mục': 'Chi trả lại tiền thừa',
      'Nội dung / Diễn giải': 'Trả lại tiền khách',
      'Chứng từ kèm theo': '',
      'Chi nhánh': '318 Vũ Quang',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_So_Quy');
  XLSX.writeFile(wb, 'Mau_Nhap_So_Quy_KiotViet_OmniERP.xlsx');
};

/**
 * Parse an uploaded Excel (.xlsx, .xls, .csv, .xlsm) file into rows and headers
 * Ultra resilient: scans all sheets to find best table, auto-detects header row
 */
export const parseExcelFile = (
  file: File
): Promise<{ rows: any[]; headers: string[]; detectedType: 'INVOICES' | 'SUPPLIERS' | 'CUSTOMERS' | 'PRODUCTS' | 'CASHBOOK'; sheetName: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          raw: false,
        });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve({ rows: [], headers: [], detectedType: 'PRODUCTS', sheetName: '' });
          return;
        }

        // Find the best worksheet with the most relevant tabular data
        let bestSheetName = workbook.SheetNames[0];
        let bestRawRows: any[][] = [];
        let maxRowCount = 0;

        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', blankrows: false });
          if (raw && raw.length > maxRowCount) {
            maxRowCount = raw.length;
            bestSheetName = sheetName;
            bestRawRows = raw;
          }
        }

        if (bestRawRows.length === 0) {
          resolve({ rows: [], headers: [], detectedType: 'PRODUCTS', sheetName: bestSheetName });
          return;
        }

        // Keyword dictionary to locate the header row
        const recognizedKeywords = [
          'ma', 'sku', 'code', 'ten', 'name', 'gia', 'ban', 'von', 'ton', 'stock',
          'price', 'barcode', 'vach', 'dvt', 'donvi', 'nhom', 'danhmuc', 'mota', 'anh',
          'ncc', 'nhacungcap', 'dienthoai', 'phone', 'email', 'diachi', 'nocan', 'tongmua',
          'masothue', 'cmnd', 'congty', 'nguoitao', 'quanhuyen', 'phuongxa', 'loaihang',
          'sdt', 'dongia', 'soluong'
        ];

        let headerRowIndex = 0;
        let maxMatchCount = 0;

        for (let r = 0; r < Math.min(bestRawRows.length, 25); r++) {
          const row = bestRawRows[r];
          if (!Array.isArray(row)) continue;
          let matchCount = 0;
          row.forEach((cell) => {
            const cleanCell = cleanTextForMatch(cell);
            if (cleanCell.length > 0) {
              const matched = recognizedKeywords.some((kw) => cleanCell.includes(kw));
              if (matched) matchCount++;
            }
          });
          if (matchCount > maxMatchCount) {
            maxMatchCount = matchCount;
            headerRowIndex = r;
          }
        }

        // Extract header row
        const headerRow = (bestRawRows[headerRowIndex] || []) as any[];
        const headers: string[] = [];
        headerRow.forEach((h, colIdx) => {
          const str = String(h || '').trim();
          headers.push(str || `Cột_${colIdx + 1}`);
        });

        const detectedType = detectExcelDataType(headers);

        // Build array of row objects
        const resultRows: any[] = [];
        for (let r = headerRowIndex + 1; r < bestRawRows.length; r++) {
          const row = bestRawRows[r];
          if (!Array.isArray(row)) continue;

          // Check if row is purely whitespace
          const isRowEmpty = row.every((c) => c === undefined || c === null || String(c).trim() === '');
          if (isRowEmpty) continue;

          const rowObj: Record<string, any> = {};
          let hasAnyData = false;

          headers.forEach((h, colIdx) => {
            const val = row[colIdx] !== undefined ? row[colIdx] : '';
            rowObj[h] = val;
            if (val !== '' && val !== null && val !== undefined) {
              hasAnyData = true;
            }
          });

          if (hasAnyData) {
            resultRows.push(rowObj);
          }
        }

        resolve({ rows: resultRows, headers, detectedType, sheetName: bestSheetName });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Convert number into Vietnamese spelled-out currency words (Bằng chữ)
 * e.g. 150000 -> "Một trăm năm mươi nghìn đồng chẵn"
 */
export const numberToVietnameseWords = (amount: number): string => {
  if (amount === 0) return 'Không đồng';
  if (!amount || isNaN(amount)) return '';

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  const readThreeDigits = (threeDigits: number, showZeroHundred: boolean): string => {
    let result = '';
    const hundred = Math.floor(threeDigits / 100);
    const ten = Math.floor((threeDigits % 100) / 10);
    const unit = threeDigits % 10;

    if (hundred > 0 || showZeroHundred) {
      result += digits[hundred] + ' trăm ';
      if (ten === 0 && unit !== 0) result += 'lẻ ';
    }

    if (ten > 0) {
      if (ten === 1) result += 'mười ';
      else result += digits[ten] + ' mươi ';
    }

    if (unit > 0) {
      if (ten > 1 && unit === 1) result += 'mốt ';
      else if (ten > 0 && unit === 5) result += 'lăm ';
      else result += digits[unit] + ' ';
    }

    return result.trim();
  };

  let num = Math.abs(Math.round(amount));
  const groups: number[] = [];

  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;
    const isFirst = i === groups.length - 1;
    const groupText = readThreeDigits(group, !isFirst);
    words += groupText + ' ' + units[i] + ' ';
  }

  words = words.trim();
  if (!words) return 'Không đồng';

  // Capitalize first letter and append "đồng"
  const formatted = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
  return formatted.replace(/\s+/g, ' ');
};

