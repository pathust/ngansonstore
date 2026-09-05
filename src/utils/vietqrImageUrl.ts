// Sinh URL ảnh mã VietQR động qua dịch vụ img.vietqr.io — tách từ formatters.ts (Pha E).
// Khác với ./vietqr.ts (sinh chuỗi EMVCo offline bằng qrcode + CRC16) — file này build URL online.

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
