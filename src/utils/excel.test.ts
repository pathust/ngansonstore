import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { buildWorksheet, findHeaderValue, parseWorkbook, scoreExcelHeaders } from './excel';

describe('Excel parsing hardening', () => {
  it('chọn sheet dữ liệu theo header thay vì sheet có nhiều dòng nhất', () => {
    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      ['BÁO CÁO TỔNG HỢP'],
      ['Chỉ tiêu', 'Giá trị'],
      ...Array.from({ length: 60 }, (_, index) => [`Chỉ tiêu ${index + 1}`, index + 1]),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Tong_hop');

    const productRows = [
      ['CỬA HÀNG NGÂN SƠN'],
      ['Danh sách hàng hóa'],
      ['Mã SKU', 'Mã vạch', 'Tên hàng hóa', 'Giá bán', 'Giá vốn', 'Tồn kho', 'Đơn vị tính'],
      ['00123', '0893000123456', 'Bóng LED 9W', 45000, 30000, 24, 'cái'],
      ['00124', '0893000123457', 'Ổ cắm 3 chấu', 65000, 42000, 12, 'cái'],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(productRows), 'Hang_hoa');

    const result = parseWorkbook(workbook);

    expect(result.sheetName).toBe('Hang_hoa');
    expect(result.headerRowIndex).toBe(2);
    expect(result.detectedType).toBe('PRODUCTS');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]['Mã SKU']).toBe('00123');
  });

  it('giữ định dạng số có số 0 đầu khi Excel dùng number format', () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Mã SKU', 'Tên hàng hóa', 'Giá bán', 'Tồn kho'],
      [123, 'Dây điện đôi', 12000, 100],
    ]);
    worksheet.A2.z = '000000';
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    const result = parseWorkbook(workbook);
    expect(result.rows[0]['Mã SKU']).toBe('000123');
  });

  it('không dùng từ khóa quá ngắn để substring-map nhầm cột', () => {
    const row = {
      'Mã hóa đơn': 'HD001',
      'Mã khách hàng': 'KH001',
    };

    expect(findHeaderValue(row, ['mã'])).toBeUndefined();
    expect(findHeaderValue(row, ['mã khách hàng'])).toBe('KH001');
  });

  it('nhận diện header có dấu tiếng Việt và trả confidence', () => {
    const detection = scoreExcelHeaders([
      'Mã nhà cung cấp',
      'Tên nhà cung cấp',
      'Điện thoại',
      'Nợ cần trả',
      'Nhóm nhà cung cấp',
    ]);

    expect(detection.type).toBe('SUPPLIERS');
    expect(detection.confidence).toBeGreaterThan(0.5);
    expect(detection.margin).toBeGreaterThan(0);
  });
});

describe('Excel export hardening', () => {
  it('xuất identifier dạng text và bổ sung metadata bảng cơ bản', () => {
    const worksheet = buildWorksheet([
      {
        'Mã SKU': '00123',
        'Mã Vạch Barcode': '0893000123456',
        'Điện thoại': '0912345678',
        'Tên hàng hóa': 'Bóng LED 9W',
        'Giá bán': 45000,
      },
    ]);

    expect(worksheet.A2.t).toBe('s');
    expect(worksheet.A2.v).toBe('00123');
    expect(worksheet.B2.t).toBe('s');
    expect(worksheet.C2.t).toBe('s');
    expect(worksheet['!autofilter']).toBeTruthy();
    expect(worksheet['!cols']?.length).toBe(5);
  });
});
