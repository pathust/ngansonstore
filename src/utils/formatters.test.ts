import { describe, it, expect } from 'vitest';
import { parseCleanNumber, formatCurrency, formatNumber } from './formatters';

describe('parseCleanNumber', () => {
  it('parse số nguyên bình thường (input number)', () => {
    expect(parseCleanNumber(150000)).toBe(150000);
  });

  it('parse chuỗi số thường', () => {
    expect(parseCleanNumber('150000')).toBe(150000);
  });

  it('parse hậu tố k (nghìn)', () => {
    expect(parseCleanNumber('150k')).toBe(150000);
  });

  it('parse hậu tố tr (triệu)', () => {
    expect(parseCleanNumber('1.5tr')).toBe(1500000);
  });

  it('parse hậu tố m (million)', () => {
    expect(parseCleanNumber('2m')).toBe(2000000);
  });

  it('parse số âm dạng dấu ngoặc đơn', () => {
    expect(parseCleanNumber('(50000)')).toBe(-50000);
  });

  it('parse số âm dạng dấu trừ đầu chuỗi', () => {
    expect(parseCleanNumber('-50000')).toBe(-50000);
  });

  it('trả về defaultVal khi input rỗng/null/undefined', () => {
    expect(parseCleanNumber('', 100)).toBe(100);
    expect(parseCleanNumber(null, 100)).toBe(100);
    expect(parseCleanNumber(undefined, 100)).toBe(100);
  });

  it('trả về 0 (mặc định) khi không truyền defaultVal và input rỗng', () => {
    expect(parseCleanNumber('')).toBe(0);
  });

  it('parse chuỗi có ký hiệu tiền tệ và khoảng trắng', () => {
    expect(parseCleanNumber('150000 đ')).toBe(150000);
    expect(parseCleanNumber('150000₫')).toBe(150000);
  });

  it('parse số có dấu chấm ngăn cách nghìn kiểu VN (150.000)', () => {
    expect(parseCleanNumber('150.000')).toBe(150000);
  });

  it('trả về defaultVal khi chuỗi không parse được thành số', () => {
    expect(parseCleanNumber('abc', 42)).toBe(42);
  });

  it('input NaN dạng number trả về defaultVal', () => {
    expect(parseCleanNumber(NaN, 7)).toBe(7);
  });
});

describe('formatCurrency', () => {
  // Intl.NumberFormat chèn khoảng trắng không ngắt (U+00A0) giữa số và "đ" tùy ICU/Node version,
  // nên dùng regex (\s khớp cả U+00A0) thay vì so sánh chuỗi tuyệt đối.
  it('định dạng VNĐ đúng, không có phần thập phân', () => {
    expect(formatCurrency(150000)).toMatch(/^150\.000\s?đ$/);
  });

  it('xử lý 0 đúng', () => {
    expect(formatCurrency(0)).toMatch(/^0\s?đ$/);
  });

  it('xử lý input falsy (undefined) như 0', () => {
    expect(formatCurrency(undefined as unknown as number)).toMatch(/^0\s?đ$/);
  });
});

describe('formatNumber', () => {
  it('định dạng số theo chuẩn vi-VN (dấu chấm ngăn cách nghìn)', () => {
    expect(formatNumber(150000)).toBe('150.000');
  });

  it('xử lý input falsy (undefined) như 0', () => {
    expect(formatNumber(undefined as unknown as number)).toBe('0');
  });
});
