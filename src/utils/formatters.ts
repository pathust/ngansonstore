// File này CHỦ Ý chỉ còn là barrel re-export để 36 file import hiện có không cần đổi đường dẫn.
// Nội dung thật đã tách theo domain (Pha E) — xem .claude/skills/refactor-roadmap/SKILL.md:
//   - ./currency.ts — định dạng/parse tiền tệ, số, số → chữ
//   - ./date.ts      — định dạng/parse ngày giờ tiếng Việt
//   - ./vietqrImageUrl.ts — sinh URL ảnh mã VietQR động (khác ./vietqr.ts vốn đã có sẵn — đó là bộ sinh EMVCo offline)
//   - ./excel.ts     — xuất/nhập Excel (mẫu import, sao lưu, đọc file)
// Code mới nên import thẳng từ file domain tương ứng thay vì từ đây.
export * from './currency';
export * from './date';
export * from './vietqrImageUrl';
export * from './excel';
