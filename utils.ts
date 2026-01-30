export const normalizeArabic = (text: string) => {
  if (!text) return '';
  return text.toString().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
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