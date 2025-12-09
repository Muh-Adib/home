/**
 * Bookings API Service
 * Centralized service untuk semua booking-related API calls
 */

import ApiClient from '../client';
import { API_ENDPOINTS } from '@/config/api';

export interface Booking {
    id: number;
    booking_number: string;
    property_id: number;
    property?: any;
    check_in: string;
    check_out: string;
    check_in_time: string;
    guest_count: number;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number?: string;
    guest_gender: 'male' | 'female';
    relationship_type: string;
    special_requests?: string;
    booking_status: string;
    payment_status: string;
    dp_percentage: number;
    total_amount: number;
    dp_amount: number;
    remaining_amount: number;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export interface CreateBookingRequest {
    check_in: string;
    check_out: string;
    check_in_time?: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_count: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number?: string;
    guest_gender: 'male' | 'female';
    relationship_type: string;
    special_requests?: string;
    dp_percentage: number;
    auto_confirm?: boolean;
}

export interface CheckAvailabilityRequest {
    property_id: number;
    check_in: string;
    check_out: string;
    guest_count: number;
    exclude_booking_id?: number;
}

export interface CheckAvailabilityResponse {
    available: boolean;
    message?: string;
    conflicts?: any[];
}

class BookingsService {
    /**
     * Get all bookings
     */
    async getAll(params?: {
        status?: string;
        payment_status?: string;
        property_id?: number;
        page?: number;
        per_page?: number;
    }): Promise<{ data: Booking[]; meta?: any }> {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.payment_status) queryParams.append('payment_status', params.payment_status);
        if (params?.property_id) queryParams.append('property_id', params.property_id.toString());
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.per_page) queryParams.append('per_page', String(params.per_page));

        const url = `${API_ENDPOINTS.bookings.index}${queryParams.toString() ? `?${queryParams}` : ''}`;
        return ApiClient.get(url);
    }

    /**
     * Get booking by ID or booking number
     */
    async getById(idOrNumber: string | number): Promise<Booking> {
        return ApiClient.get(API_ENDPOINTS.bookings.show(idOrNumber));
    }

    /**
     * Create booking
     */
    async create(data: CreateBookingRequest): Promise<Booking> {
        return ApiClient.post(API_ENDPOINTS.bookings.create, data);
    }

    /**
     * Update booking
     */
    async update(idOrNumber: string | number, data: Partial<Booking>): Promise<Booking> {
        return ApiClient.put(API_ENDPOINTS.bookings.update(idOrNumber), data);
    }

    /**
     * Cancel booking
     */
    async cancel(idOrNumber: string | number, reason?: string): Promise<Booking> {
        return ApiClient.patch(API_ENDPOINTS.bookings.cancel(idOrNumber), { reason });
    }

    /**
     * Check email exists
     */
    async checkEmail(email: string): Promise<{ exists: boolean; user?: any }> {
        return ApiClient.post('/api/check-email', { email });
    }

    /**
     * Check availability (admin)
     */
    async checkAvailability(data: CheckAvailabilityRequest): Promise<CheckAvailabilityResponse> {
        return ApiClient.post('/api/admin/booking-management/check-availability', data);
    }

    /**
     * Calculate rate (admin)
     */
    async calculateRate(data: {
        property_id: number;
        check_in: string;
        check_out: string;
        guest_count: number;
    }): Promise<any> {
        return ApiClient.post('/api/admin/booking-management/calculate-rate', data);
    }

    /**
     * Get availability and rates (admin)
     */
    async getAvailabilityAndRates(data: {
        property_id: number;
        check_in: string;
        check_out: string;
        guest_count: number;
    }): Promise<any> {
        return ApiClient.post('/api/admin/booking-management/availability-and-rates', data);
    }

    /**
     * Get property date range (admin)
     */
    async getPropertyDateRange(propertyId: number,startDate: string,endDate: string ): Promise<any> {
        const payload = {
            property_id: propertyId,
            start_date: startDate,
            end_date: endDate,
        };

        return ApiClient.post('/api/admin/booking-management/property-date-range', payload);
}

    /**
     * Get timeline (admin)
     */
    async getTimeline(params: {
        property_id?: number;
        month?: string;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params.property_id) queryParams.append('property_id', params.property_id.toString());
        if (params.month) queryParams.append('month', params.month);

        return ApiClient.get(`/api/admin/booking-management/timeline?${queryParams}`);
    }
}

// Export singleton instance
export const bookingsService = new BookingsService();
export default bookingsService;



