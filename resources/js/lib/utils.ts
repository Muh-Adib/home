import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge classes with tailwind-merge with clsx full feature
 * Based on: https://theodorusclarence.com/blog/fully-reusable-components
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Re-export currency formatting utilities
export { formatCurrency, formatNumber, formatCurrencyShort } from '@/utils/formatCurrency';
