import { useEffect, useState } from 'react';

/**
 * Normalizes Arabic text by removing diacritics (Tashkeel) and standardizing 
 * variations of characters like Alef and Yaa to ensure robust search matching.
 * 
 * @param text The raw Arabic string
 * @returns The normalized Arabic string
 */
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

/**
 * Converts various date formats into a standardized 'yyyy-MM-dd' string.
 * Supports handling of DD/MM/YYYY, DD-MM-YYYY, and localized Arabic formats.
 * 
 * @param dateStr The input date string
 * @returns Standard ISO-like date string 'yyyy-MM-dd' or empty string if invalid
 */
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


/**
 * Retrieves the current date formatted as 'yyyy-MM-dd'.
 * Useful for initializing date pickers or comparing daily logs.
 * 
 * @returns The current date string
 */
export const getTodayDate = (): string => new Date().toISOString().split('T')[0];


/**
 * Formats a numeric amount into a localized currency string.
 * 
 * @param amount The numeric value to format
 * @returns The localized formatted string (e.g., 1,234.56)
 */
export const formatCurrency = (amount: number): string => amount.toLocaleString();

/**
 * Converts Arabic/Persian digits (٠١٢٣٤٥٦٧٨٩) embedded in a string to standard English digits (0-9).
 * 
 * @param str The string possibly containing Arabic numbers
 * @returns The string with all numerals converted to English digits
 */
export const toEnglishDigits = (str: string) => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const englishDigits = '0123456789';
  return str.split('').map(c => {
    const index = arabicDigits.indexOf(c);
    return index !== -1 ? englishDigits[index] : c;
  }).join('');
};


/**
 * Multi-field search utility. Checks if the `searchTerm` exists within any of the provided fields.
 * Applies continuous Arabic normalization on both the search term and the fields out of the box.
 * 
 * @param searchTerm The user's input search query
 * @param fields Array of string values mapped from the item being searched
 * @returns True if the search term matches any field, false otherwise
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
 * Standard debounce hook. Delays updating the returned value until after the specified delay 
 * has passed without any new updates to the input value.
 * 
 * @param value The fast-changing value (e.g., text input)
 * @param delay MS to wait before resolving the debounced value (default: 300ms)
 * @returns The slowly updated debounced value
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

/**
 * Encodes a numeric ID into a secure, obfuscated short-string (e.g., base62)
 * for use in shareable links, preventing predictable ID guessing.
 * 
 * @param id The raw numeric ID to encode
 * @returns The obfuscated short ID string
 */
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

/**
 * Decodes an obfuscated short-string back into the original numeric ID.
 * 
 * @param encoded The obfuscated short ID string
 * @returns The original numeric ID
 */
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