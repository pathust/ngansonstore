import * as XLSX from 'xlsx';
import { Product, Order, InventoryAudit, Supplier, Customer } from '../types';

// Xuất/nhập Excel (mẫu import, sao lưu, đọc file) — tách từ formatters.ts (Pha E).

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};


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


export const cleanTextForMatch = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
};


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


