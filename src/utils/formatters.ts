// File này CHỦ Ý chỉ còn là barrel re-export để 36 file import hiện có không cần đổi đường dẫn.
// Nội dung thật đã tách theo domain (Pha E) — xem .claude/skills/refactor-roadmap/SKILL.md:
//   - ./currency.ts — định dạng/parse tiền tệ, số, số → chữ
//   - ./date.ts      — định dạng/parse ngày giờ tiếng Việt
//   - ./vietqrImageUrl.ts — sinh URL ảnh mã VietQR động (khác ./vietqr.ts vốn đã có sẵn — đó là bộ sinh EMVCo offline)
//   - ./excel.ts     — xuất/nhập Excel (mẫu import, sao lưu, đọc file)
// Excel KHÔNG re-export ở barrel này để các màn hình chỉ cần format tiền/ngày không tải cả thư viện XLSX.
export * from './currency';
export * from './date';
export * from './vietqrImageUrl';

// Helper text nhẹ, dùng cả ngoài luồng Excel (AI/voice matching).
export const cleanTextForMatch = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
};
