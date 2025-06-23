/**
 * Date Utility Library
 * Modular date utilities using native JavaScript and Intl API
 * Replaces date-fns dependency for better React 19 compatibility
 */

// Types
export interface DateFormatOptions {
  locale?: string;
  timeZone?: string;
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  weekday?: 'long' | 'short' | 'narrow';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Constants
export const DEFAULT_LOCALE = 'id-ID';
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

// Format Patterns
export const DATE_FORMATS = {
  SHORT: { day: 'numeric', month: 'short', year: 'numeric' },
  LONG: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  TIME: { hour: '2-digit', minute: '2-digit' },
  DATETIME: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  ISO: { year: 'numeric', month: '2-digit', day: '2-digit' },
  MONTH_YEAR: { month: 'long', year: 'numeric' },
  WEEKDAY: { weekday: 'short' },
} as const;

// Core Formatting Functions
export const formatDate = (
  date: Date | string,
  options: DateFormatOptions = DATE_FORMATS.SHORT,
  locale: string = DEFAULT_LOCALE
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

export const formatDateTime = (
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string => {
  return formatDate(date, DATE_FORMATS.DATETIME, locale);
};

export const formatTime = (
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string => {
  return formatDate(date, DATE_FORMATS.TIME, locale);
};

export const formatLongDate = (
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string => {
  return formatDate(date, DATE_FORMATS.LONG, locale);
};

export const formatMonthYear = (
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string => {
  return formatDate(date, DATE_FORMATS.MONTH_YEAR, locale);
};

// Date Manipulation Functions
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

export const subtractDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

export const subtractMonths = (date: Date, months: number): Date => {
  return addMonths(date, -months);
};

export const subtractYears = (date: Date, years: number): Date => {
  return addYears(date, -years);
};

// Date Comparison Functions
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const isYesterday = (date: Date): boolean => {
  return isSameDay(date, subtractDays(new Date(), 1));
};

export const isTomorrow = (date: Date): boolean => {
  return isSameDay(date, addDays(new Date(), 1));
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isWeekday = (date: Date): boolean => {
  return !isWeekend(date);
};

// Date Range Functions
export const getDaysBetween = (startDate: Date, endDate: Date): number => {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

export const getNightsBetween = (startDate: Date, endDate: Date): number => {
  return Math.max(0, getDaysBetween(startDate, endDate));
};

export const getDefaultDateRange = (nights: number = 1): DateRange => {
  const today = new Date();
  const endDate = addDays(today, nights);
  
  return {
    startDate: today.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

export const formatDateRange = (
  startDate: string,
  endDate: string,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!startDate || !endDate) return '';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return `${formatDate(start, DATE_FORMATS.SHORT, locale)} - ${formatDate(end, DATE_FORMATS.SHORT, locale)}`;
};

// Calendar Functions
export const getStartOfWeek = (date: Date, startOfWeek: number = 0): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : startOfWeek);
  result.setDate(diff);
  return result;
};

export const getEndOfWeek = (date: Date, startOfWeek: number = 0): Date => {
  const start = getStartOfWeek(date, startOfWeek);
  return addDays(start, 6);
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const getDaysInMonth = (date: Date): number => {
  return getEndOfMonth(date).getDate();
};

// Get day of week (0 = Sunday, 1 = Monday, etc.)
export const getDay = (date: Date): number => {
  return date.getDay();
};

export const generateCalendarDates = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = getStartOfWeek(firstDay);
  const endDate = getEndOfWeek(lastDay);
  
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Validation Functions
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const parseDate = (dateString: string): Date | null => {
  const date = new Date(dateString);
  return isValidDate(date) ? date : null;
};

// Utility Functions
export const toISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const fromISODateString = (isoString: string): Date => {
  return new Date(isoString + 'T00:00:00');
};

export const getRelativeTimeString = (
  date: Date,
  locale: string = DEFAULT_LOCALE
): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} bulan yang lalu`;
  
  return `${Math.floor(diffInSeconds / 31536000)} tahun yang lalu`;
};

// Export all functions as default object for convenience
export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatLongDate,
  formatMonthYear,
  addDays,
  addMonths,
  addYears,
  subtractDays,
  subtractMonths,
  subtractYears,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  isWeekend,
  isWeekday,
  getDaysBetween,
  getNightsBetween,
  getDefaultDateRange,
  formatDateRange,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getDaysInMonth,
  generateCalendarDates,
  isValidDate,
  parseDate,
  toISODateString,
  fromISODateString,
  getRelativeTimeString,
  DATE_FORMATS,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  getDay,
}; 