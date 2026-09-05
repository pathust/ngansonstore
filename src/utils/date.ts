// Định dạng & parse ngày giờ tiếng Việt — tách từ formatters.ts (Pha E).

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


export const getCurrentVietnameseDate = (): string => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};


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


