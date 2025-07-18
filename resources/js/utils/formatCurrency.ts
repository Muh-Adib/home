/**
 * Format currency value to Indonesian Rupiah
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value);
}

/**
 * Format currency without currency symbol
 */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
    }).format(value);
}

/**
 * Format currency in short format (K, M, B)
 */
export function formatCurrencyShort(value: number): string {
    if (value >= 1_000_000_000) {
        return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
        return `Rp ${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `Rp ${(value / 1_000).toFixed(1)}K`;
    }
    return `Rp ${value.toLocaleString('id-ID')}`;
}