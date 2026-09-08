import { cleanTextForMatch } from './formatters';

/**
 * Match a logical field against imported spreadsheet headers without loading XLSX.
 * Exact matches win, then constrained prefix/substring matches.
 */
export const findHeaderValue = (row: Record<string, any>, candidateKeywords: string[]): any => {
  if (!row || typeof row !== 'object') return undefined;
  const keys = Object.keys(row);

  for (const kw of candidateKeywords) {
    const target = cleanTextForMatch(kw);
    for (const key of keys) {
      const cleanKey = cleanTextForMatch(key);
      if (cleanKey === target) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
    }
  }

  for (const kw of candidateKeywords) {
    const target = cleanTextForMatch(kw);
    if (target.length < 3) continue;
    for (const key of keys) {
      const cleanKey = cleanTextForMatch(key);
      if (cleanKey.startsWith(target)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
    }
  }

  for (const kw of candidateKeywords) {
    const target = cleanTextForMatch(kw);
    if (target.length < 6) continue;
    for (const key of keys) {
      const cleanKey = cleanTextForMatch(key);
      if (cleanKey.includes(target) && cleanKey.length - target.length <= 16) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
    }
  }

  return undefined;
};
