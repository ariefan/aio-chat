/**
 * Shared utility functions for formatting data
 * Centralizes all formatting logic to ensure consistency across the application
 */

/**
 * Format a number as Indonesian Rupiah currency
 * @param amount - The amount to format
 * @param minimumFractionDigits - Minimum decimal places (default: 0)
 * @returns Formatted currency string (e.g., "Rp 1.000.000")
 */
export function formatCurrency(
  amount: number,
  minimumFractionDigits: number = 0
): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits,
  }).format(amount);
}

/**
 * Format a date string to Indonesian locale
 * @param date - ISO date string or null
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or "-"
 */
export function formatDate(
  date: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  if (!date) return '-';

  try {
    return new Intl.DateTimeFormat('id-ID', options).format(new Date(date));
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Format a date string to short Indonesian format (DD/MM/YYYY)
 * @param date - ISO date string or null
 * @returns Short formatted date string or "-"
 */
export function formatDateShort(date: string | null | undefined): string {
  return formatDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format a date and time string to Indonesian locale
 * @param date - ISO date string or null
 * @returns Formatted datetime string or "-"
 */
export function formatDateTime(date: string | null | undefined): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a time string to HH:MM format
 * @param date - ISO date string or null
 * @returns Formatted time string or "-"
 */
export function formatTime(date: string | null | undefined): string {
  if (!date) return '-';

  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
}

/**
 * Format a date as relative time (e.g., "2 jam yang lalu", "kemarin")
 * @param date - ISO date string or null
 * @returns Relative time string or "-"
 */
export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '-';

  try {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;

    return formatDateShort(date);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '-';
  }
}

/**
 * Format a phone number to Indonesian format
 * @param phone - Phone number string
 * @returns Formatted phone number or original if invalid
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format: 0812-3456-7890
  if (cleaned.length >= 10) {
    return cleaned.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }

  return phone;
}

/**
 * Format a number with thousands separator
 * @param num - Number to format
 * @returns Formatted number string (e.g., "1.000.000")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Format a percentage
 * @param value - Value between 0 and 1
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate a string to a maximum length
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(
  str: string | null | undefined,
  maxLength: number = 50
): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Capitalize first letter of each word
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
