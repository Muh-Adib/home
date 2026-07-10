/**
 * Normalize phone number to WhatsApp format (wa.me)
 * E.g., '08123456789' -> '628123456789'
 * E.g., '+62 812-3456-789' -> '628123456789'
 */
export function normalizeWhatsAppNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with '0', replace with '62'
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }

    return cleaned;
}

/**
 * Generate a WhatsApp link (wa.me) for a normalized phone number
 */
export function getWhatsAppLink(phone: string, text?: string): string {
    const normalized = normalizeWhatsAppNumber(phone);
    if (!normalized) return '#';
    
    const baseUrl = `https://wa.me/${normalized}`;
    if (text) {
        return `${baseUrl}?text=${encodeURIComponent(text)}`;
    }
    return baseUrl;
}
