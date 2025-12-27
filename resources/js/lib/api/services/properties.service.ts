/**
 * Properties API Service
 * Centralized service untuk semua property-related API calls
 */

import ApiClient from '../client';
import { API_ENDPOINTS } from '@/config/api';

export interface Property {
    id: number;
    slug: string;
    name: string;
    description?: string;
    address: string;
    capacity: number;
    capacity_max: number;
    base_rate: number;
    extra_bed_rate?: number;
    check_in_time: string;
    check_out_time: string;
    status: 'active' | 'inactive' | 'maintenance';
    featured: boolean;
    media?: PropertyMedia[];
    amenities?: Amenity[];
    [key: string]: any;
}

export interface PropertyMedia {
    id: number;
    url: string;
    type: 'image' | 'video';
    is_featured: boolean;
    order: number;
}

export interface Amenity {
    id: number;
    name: string;
    icon?: string;
    category?: string;
}

export interface RateCalculation {
    success: boolean;
    calculation: {
        seasonal_premium: number;
        nights: number;
        weekday_nights: number;
        weekend_nights: number;
        base_amount: number;
        total_base_amount: number;
        weekend_premium: number;
        extra_bed_amount: number;
        cleaning_fee: number;
        minimum_stay_discount: number;
        subtotal: number;
        tax_amount: number;
        total_amount: number;
        extra_beds: number;
        rate_breakdown: {
            seasonal_rates_applied: number;
            base_rate_per_night: number;
            weekend_premium_percent: number;
            peak_season_applied: number;
            long_weekend_applied: number;
        };
        daily_breakdown?: Record<string, any>;
    };
    message?: string;
}

export interface AvailabilityData {
    available?: boolean;
    success?: boolean;
    property_id?: number | string;
    date_range?: {
        start: string;
        end: string;
    };
    booked_dates?: string[];
    booked_periods?: Array<{ start: string; end: string }> | string[][];
    dates?: Record<string, {
        available: boolean;
        rate?: number;
        seasonal_rate?: any;
    }>;
    rates?: Record<string, any>;
    property_info?: any;
}

export interface AvailabilityAndRatesResponse {
    success: boolean;
    data: {
        availability: AvailabilityData;
        rates: RateCalculation;
    };
}

export interface MapCoordinates {
    properties: Array<{
        id: number;
        slug: string;
        name: string;
        latitude: number;
        longitude: number;
        address: string;
    }>;
}

class PropertiesService {
    /**
     * Get all properties
     */
    async getAll(params?: {
        search?: string;
        status?: string;
        featured?: boolean;
        page?: number;
        per_page?: number;
    }): Promise<{ data: Property[]; meta?: any }> {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.featured !== undefined) queryParams.append('featured', String(params.featured));
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.per_page) queryParams.append('per_page', String(params.per_page));

        const url = `${API_ENDPOINTS.properties.index}${queryParams.toString() ? `?${queryParams}` : ''}`;
        return ApiClient.get(url);
    }

    /**
     * Get property by ID or slug
     */
    async getById(idOrSlug: string | number): Promise<Property> {
        return ApiClient.get(API_ENDPOINTS.properties.show(idOrSlug));
    }

    /**
     * Calculate rate for property
     */
    async calculateRate(
        propertySlug: string,
        params: {
            check_in: string;
            check_out: string;
            guest_count: number;
        }
    ): Promise<RateCalculation> {
        const queryParams = new URLSearchParams({
            check_in: params.check_in,
            check_out: params.check_out,
            guest_count: params.guest_count.toString(),
        });

        return ApiClient.get(`/api/properties/${propertySlug}/calculate-rate?${queryParams}`);
    }

    /**
     * Get availability for property
     */
    async getAvailability(
        propertySlug: string,
        params: {
            start_date?: string;
            end_date?: string;
            guest_count?: number;
        }
    ): Promise<AvailabilityData> {
        const queryParams = new URLSearchParams();
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.guest_count) queryParams.append('guest_count', params.guest_count.toString());

        const url = `/api/properties/${propertySlug}/availability${queryParams.toString() ? `?${queryParams}` : ''}`;
        return ApiClient.get(url);
    }

    /**
     * Get availability and rates
     */
    async getAvailabilityAndRates(
        propertySlug: string,
        params: {
            start_date: string;
            end_date: string;
            guest_count: number;
        }
    ): Promise<AvailabilityAndRatesResponse> {
        const queryParams = new URLSearchParams({
            start_date: params.start_date,
            end_date: params.end_date,
            guest_count: params.guest_count.toString(),
        });

        return ApiClient.get(`/api/properties/${propertySlug}/availability-and-rates?${queryParams}`);
    }

    /**
     * Get map coordinates for all properties
     */
    async getMapCoordinates(): Promise<MapCoordinates> {
        return ApiClient.get('/api/properties/map-coordinates');
    }

    /**
     * Search properties
     */
    async search(params: {
        query?: string;
        location?: string;
        check_in?: string;
        check_out?: string;
        guest_count?: number;
        amenities?: number[];
    }): Promise<{ data: Property[]; meta?: any }> {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.append('query', params.query);
        if (params.location) queryParams.append('location', params.location);
        if (params.check_in) queryParams.append('check_in', params.check_in);
        if (params.check_out) queryParams.append('check_out', params.check_out);
        if (params.guest_count) queryParams.append('guest_count', params.guest_count.toString());
        if (params.amenities) {
            params.amenities.forEach(id => queryParams.append('amenities[]', id.toString()));
        }

        const url = `/api/properties/search${queryParams.toString() ? `?${queryParams}` : ''}`;
        return ApiClient.get(url);
    }

    /**
     * Create property (admin only)
     */
    async create(data: Partial<Property>): Promise<Property> {
        return ApiClient.post(API_ENDPOINTS.properties.create, data);
    }

    /**
     * Update property (admin only)
     */
    async update(idOrSlug: string | number, data: Partial<Property>): Promise<Property> {
        return ApiClient.put(API_ENDPOINTS.properties.update(idOrSlug), data);
    }

    /**
     * Delete property (admin only)
     */
    async delete(idOrSlug: string | number): Promise<void> {
        return ApiClient.delete(API_ENDPOINTS.properties.delete(idOrSlug));
    }
}

// Export singleton instance
export const propertiesService = new PropertiesService();
export default propertiesService;



