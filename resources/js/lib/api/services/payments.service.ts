/**
 * Payments API Service
 * Centralized service untuk semua payment-related API calls
 */

import ApiClient from '../client';
import { API_ENDPOINTS } from '@/config/api';

export interface Payment {
    id: number;
    payment_number: string;
    booking_id: number;
    booking?: any;
    amount: number;
    payment_method_id: number;
    payment_method?: any;
    payment_type: 'dp' | 'full' | 'additional';
    status: 'pending' | 'verified' | 'rejected' | 'cancelled';
    payment_date?: string;
    verified_at?: string;
    verified_by?: number;
    notes?: string;
    proof_url?: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export interface CreatePaymentRequest {
    booking_id: number;
    amount: number;
    payment_method_id: number;
    payment_type: 'dp' | 'full' | 'additional';
    payment_date?: string;
    notes?: string;
    proof?: File | string;
}

class PaymentsService {
    /**
     * Get all payments
     */
    async getAll(params?: {
        status?: string;
        payment_type?: string;
        booking_id?: number;
        page?: number;
        per_page?: number;
    }): Promise<{ data: Payment[]; meta?: any }> {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.payment_type) queryParams.append('payment_type', params.payment_type);
        if (params?.booking_id) queryParams.append('booking_id', params.booking_id.toString());
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.per_page) queryParams.append('per_page', String(params.per_page));

        const url = `${API_ENDPOINTS.payments.index}${queryParams.toString() ? `?${queryParams}` : ''}`;
        return ApiClient.get(url);
    }

    /**
     * Get payment by ID or payment number
     */
    async getById(idOrNumber: string | number): Promise<Payment> {
        return ApiClient.get(API_ENDPOINTS.payments.show(idOrNumber));
    }

    /**
     * Create payment
     */
    async create(data: CreatePaymentRequest): Promise<Payment> {
        const formData = new FormData();
        formData.append('booking_id', data.booking_id.toString());
        formData.append('amount', data.amount.toString());
        formData.append('payment_method_id', data.payment_method_id.toString());
        formData.append('payment_type', data.payment_type);
        if (data.payment_date) formData.append('payment_date', data.payment_date);
        if (data.notes) formData.append('notes', data.notes);
        if (data.proof instanceof File) {
            formData.append('proof', data.proof);
        } else if (data.proof) {
            formData.append('proof_url', data.proof);
        }

        return ApiClient.post(API_ENDPOINTS.payments.create, formData);
    }

    /**
     * Verify payment
     */
    async verify(idOrNumber: string | number, data?: { notes?: string }): Promise<Payment> {
        return ApiClient.patch(API_ENDPOINTS.payments.verify(idOrNumber), data);
    }

    /**
     * Reject payment
     */
    async reject(idOrNumber: string | number, reason?: string): Promise<Payment> {
        return ApiClient.patch(`/api/payments/${idOrNumber}/reject`, { reason });
    }
}

// Export singleton instance
export const paymentsService = new PaymentsService();
export default paymentsService;



