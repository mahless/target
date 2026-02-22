import { useEffect, useState } from 'react';

export const normalizeArabic = (text: string) => {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u065F]/g, '')
    // Remove punctuation and special characters
    .replace(/[^\u0600-\u06FF\w\s]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ');
};

export const normalizeDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Strip time part if it's an ISO string or contains time
  let s = String(dateStr).trim();
  if (s.includes('T')) s = s.split('T')[0];
  if (s.includes(' ')) s = s.split(' ')[0];

  // Handle DD/MM/YYYY or DD-MM-YYYY
  let parts = s.includes('/') ? s.split('/') : s.split('-');
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return s;
};

export const toEnglishDigits = (str: string) => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const englishDigits = '0123456789';
  return str.split('').map(c => {
    const index = arabicDigits.indexOf(c);
    return index !== -1 ? englishDigits[index] : c;
  }).join('');
};

/**
 * Search across multiple fields with Arabic normalization
 * @param searchTerm - The search term to look for
 * @param fields - Array of field values to search in
 * @returns true if any field matches the search term
 */
export const searchMultipleFields = (searchTerm: string, fields: (string | undefined | null)[]): boolean => {
  if (!searchTerm || searchTerm.length === 0) return true;

  // Normalize and convert search term
  const normalizedTerm = normalizeArabic(toEnglishDigits(searchTerm.toLowerCase()));

  // Check if any field contains the search term
  return fields.some(field => {
    if (!field) return false;
    const normalizedField = normalizeArabic(toEnglishDigits(String(field).toLowerCase()));
    return normalizedField.includes(normalizedTerm);
  });
};

/**
 * Custom hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 */
export const useDebounce = <T,>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ==========================================
// ID Obfuscation (Base62 for short URLs)
// ==========================================
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const encodeId = (id: string): string => {
  if (!id) return '';
  // Check if purely numeric
  if (/^\d+$/.test(id)) {
    let num = BigInt(id);
    if (num === 0n) return "N0";
    let encoded = "";
    while (num > 0n) {
      encoded = BASE62[Number(num % 62n)] + encoded;
      num = num / 62n;
    }
    return "N" + encoded;
  }
  // Otherwise, fallback to url-safe base64
  try {
    const b64 = btoa(id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return "S" + b64;
  } catch {
    return id; // fallback
  }
};

export const decodeId = (encoded: string): string => {
  if (!encoded) return '';
  const type = encoded.charAt(0);
  const data = encoded.substring(1);

  if (type === 'N') {
    let num = 0n;
    for (let i = 0; i < data.length; i++) {
      const idx = BASE62.indexOf(data[i]);
      if (idx === -1) return encoded; // invalid format, return original
      num = num * 62n + BigInt(idx);
    }
    return num.toString();
  }

  if (type === 'S') {
    try {
      // Restore padding
      let b64 = data.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) {
        b64 += '=';
      }
      return atob(b64);
    } catch {
      return encoded; // fallback
    }
  }

  return encoded; // Fallback for old unencoded IDs
};