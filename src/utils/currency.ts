// Định dạng & parse tiền tệ/số — tách từ formatters.ts (Pha E).

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


