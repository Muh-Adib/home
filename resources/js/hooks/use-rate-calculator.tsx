import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

/**
 * Interface untuk rate calculation request
 */
interface RateCalculationRequest {
    propertySlug: string;
    checkIn: string;
    checkOut: string;
    guestCount?: number;
}

/**
 * Interface untuk rate calculation response
 */
interface RateCalculationResponse {
    success: boolean;
    property_id: number;
    dates: {
        check_in: string;
        check_out: string;
    };
    guest_count: number;
    calculation: {
        nights: number;
        weekday_nights: number;
        weekend_nights: number;
        seasonal_nights: number;
        base_amount: number;
        total_base_amount: number;
        weekend_premium: number;
        seasonal_premium: number;
        extra_bed_amount: number;
        cleaning_fee: number;
        minimum_stay_discount: number;
        subtotal: number;
        tax_amount: number;
        total_amount: number;
        extra_beds: number;
        rate_breakdown: {
            base_rate_per_night: number;
            weekend_premium_percent: number;
            peak_season_applied: boolean;
            long_weekend_applied: boolean;
            seasonal_rates_applied: Array<{
                name: string;
                description: string;
                dates: string[];
            }>;
        };
        daily_breakdown: Record<string, {
            date: string;
            day_name: string;
            base_rate: number;
            final_rate: number;
            premiums: Array<{
                type: string;
                name: string;
                description: string;
                amount: number;
            }>;
            seasonal_rate?: {
                name: string;
                type: string;
                value: number;
            };
        }>;
        summary: {
            average_nightly_rate: number;
            total_nights: number;
            base_nights_rate: number;
            total_premiums: number;
            effective_discount: number;
            taxes_and_fees: number;
        };
    };
    formatted: {
        base_amount: string;
        weekend_premium: string;
        seasonal_premium: string;
        extra_bed_amount: string;
        cleaning_fee: string;
        total_amount: string;
        per_night: string;
    };
    error?: string;
}

/**
 * Interface untuk hook state
 */
interface UseRateCalculatorState {
    data: RateCalculationResponse | null;
    loading: boolean;
    error: string | null;
    isValidating: boolean;
}

/**
 * Interface untuk hook options
 */
interface UseRateCalculatorOptions {
    debounceMs?: number;
    cacheTimeout?: number;
    enableAutoCalculate?: boolean;
    onSuccess?: (data: RateCalculationResponse) => void;
    onError?: (error: string) => void;
}

/**
 * Cache storage untuk rate calculations
 */
class RateCalculationCache {
    private static instance: RateCalculationCache;
    private cache = new Map<string, {
        data: RateCalculationResponse;
        timestamp: number;
        ttl: number;
    }>();

    static getInstance(): RateCalculationCache {
        if (!RateCalculationCache.instance) {
            RateCalculationCache.instance = new RateCalculationCache();
        }
        return RateCalculationCache.instance;
    }

    generateKey(request: RateCalculationRequest): string {
        return `${request.propertySlug}-${request.checkIn}-${request.checkOut}-${request.guestCount || 0}`;
    }

    get(key: string): RateCalculationResponse | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        // Check if cache is expired
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    set(key: string, data: RateCalculationResponse, ttl: number = 5 * 60 * 1000): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    clear(): void {
        this.cache.clear();
    }

    clearProperty(propertySlug: string): void {
        for (const [key] of this.cache) {
            if (key.startsWith(`${propertySlug}-`)) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * Custom hook untuk rate calculation dengan optimisasi dan caching
 * 
 * Features:
 * - Automatic caching dengan TTL
 * - Debouncing untuk menghindari spam requests
 * - Loading states untuk UX yang baik
 * - Error handling yang comprehensive
 * - Auto-calculation saat parameters berubah
 * - Cache invalidation yang smart
 * - TypeScript support penuh
 * 
 * @param options - Konfigurasi hook
 */
export function useRateCalculator(options: UseRateCalculatorOptions = {}) {
    const {
        debounceMs = 500,
        cacheTimeout = 5 * 60 * 1000, // 5 menit default
        enableAutoCalculate = true,
        onSuccess,
        onError
    } = options;

    const [state, setState] = useState<UseRateCalculatorState>({
        data: null,
        loading: false,
        error: null,
        isValidating: false
    });

    const cache = RateCalculationCache.getInstance();
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Validate rate calculation request
     */
    const validateRequest = useCallback((request: RateCalculationRequest): string | null => {
        if (!request.propertySlug) return 'Property slug is required';
        if (!request.checkIn) return 'Check-in date is required';
        if (!request.checkOut) return 'Check-out date is required';
        
        const checkInDate = new Date(request.checkIn);
        const checkOutDate = new Date(request.checkOut);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(checkInDate.getTime())) return 'Invalid check-in date format';
        if (isNaN(checkOutDate.getTime())) return 'Invalid check-out date format';
        if (checkInDate < today) return 'Check-in date cannot be in the past';
        if (checkOutDate <= checkInDate) return 'Check-out date must be after check-in date';
        if (request.guestCount && request.guestCount < 1) return 'Guest count must be at least 1';
        if (request.guestCount && request.guestCount > 50) return 'Guest count cannot exceed 50';
        
        return null;
    }, []);

    /**
     * Core function untuk melakukan API call
     */
    const performCalculation = useCallback(async (
        request: RateCalculationRequest,
        useCache: boolean = true
    ): Promise<RateCalculationResponse> => {
        // Validate request
        const validationError = validateRequest(request);
        if (validationError) {
            throw new Error(validationError);
        }

        // Check cache first
        const cacheKey = cache.generateKey(request);
        if (useCache) {
            const cached = cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        try {
            // Build query parameters for GET request
            const params = new URLSearchParams({
                check_in: request.checkIn,
                check_out: request.checkOut,
                guest_count: (request.guestCount || 2).toString()
            });

            console.log('🔍 Rate calculation request:', {
                propertySlug: request.propertySlug,
                params: Object.fromEntries(params),
                url: `/api/properties/${request.propertySlug}/calculate-rate?${params}`
            });

            const response = await fetch(`/api/properties/${request.propertySlug}/calculate-rate?${params}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ API Error Response:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData,
                    requestParams: Object.fromEntries(params),
                    url: `/api/properties/${request.propertySlug}/calculate-rate?${params}`
                });
                
                // Handle different error types
                if (response.status === 422) {
                    const errorMessage = errorData.message || 'Validation failed';
                    const validationErrors = errorData.errors || {};
                    const debugInfo = errorData.debug_info || {};
                    
                    console.error('🔍 Validation Error Details:', {
                        message: errorMessage,
                        errors: validationErrors,
                        debugInfo,
                        requestData: Object.fromEntries(params)
                    });
                    
                    // Create more informative error message
                    let detailedMessage = errorMessage;
                    if (Object.keys(validationErrors).length > 0) {
                        const errorMessages = Object.values(validationErrors).flat();
                        detailedMessage += ': ' + errorMessages.join(', ');
                    }
                    
                    throw new Error(detailedMessage);
                }
                
                // Handle availability conflicts (409)
                if (response.status === 409) {
                    const errorType = errorData.error_type;
                    const message = errorData.message || 'Property not available';
                    
                    if (errorType === 'availability') {
                        console.warn('🚫 Property not available:', {
                            message,
                            availabilityInfo: errorData.availability_info,
                            bookedPeriods: errorData.availability_info?.booked_periods,
                            alternativeDates: errorData.availability_info?.alternative_dates
                        });
                        
                        // Create availability error with suggestions
                        let availabilityMessage = message;
                        if (errorData.availability_info?.alternative_dates) {
                            const altDates = errorData.availability_info.alternative_dates;
                            if (altDates.check_in && altDates.check_out) {
                                availabilityMessage += `. Next available: ${altDates.check_in} to ${altDates.check_out}`;
                            }
                        }
                        
                        throw new Error(availabilityMessage);
                    }
                }
                
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data: RateCalculationResponse = await response.json();
            
            // Handle success=false in response body (additional safety check)
            if (!data.success) {
                const errorType = (data as any).error_type;
                const message = (data as any).message || 'Rate calculation failed';
                
                console.warn('⚠️ Rate calculation returned success=false:', {
                    errorType,
                    message,
                    data
                });
                
                // Handle availability errors in response body
                if (errorType === 'availability') {
                    const availabilityInfo = (data as any).availability_info;
                    console.warn('🚫 Availability error in response:', availabilityInfo);
                    
                    let availabilityMessage = message;
                    if (availabilityInfo?.alternative_dates) {
                        const altDates = availabilityInfo.alternative_dates;
                        if (altDates.check_in && altDates.check_out) {
                            availabilityMessage += `. Next available: ${altDates.check_in} to ${altDates.check_out}`;
                        }
                    }
                    
                    throw new Error(availabilityMessage);
                }
                
                throw new Error(message);
            }

            console.log('✅ Rate calculation successful:', {
                propertySlug: request.propertySlug,
                totalAmount: data.formatted?.total_amount,
                nights: data.calculation?.nights
            });

            // Cache successful response
            cache.set(cacheKey, data, cacheTimeout);

            return data;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Request was cancelled');
            }
            throw error;
        }
    }, [validateRequest, cache, cacheTimeout]);

    /**
     * Calculate rate dengan debouncing dan state management
     */
    const calculateRate = useCallback(async (
        request: RateCalculationRequest,
        options: { immediate?: boolean; skipCache?: boolean } = {}
    ) => {
        const { immediate = false, skipCache = false } = options;

        // Clear existing debounce
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const executeCalculation = async () => {
            try {
                setState(prev => ({ 
                    ...prev, 
                    loading: true, 
                    error: null,
                    isValidating: !immediate 
                }));

                const data = await performCalculation(request, !skipCache);
                
                setState(prev => ({ 
                    ...prev, 
                    data, 
                    loading: false,
                    isValidating: false,
                    error: null 
                }));

                if (onSuccess) {
                    onSuccess(data);
                }

                return data;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                
                setState(prev => ({ 
                    ...prev, 
                    error: errorMessage, 
                    loading: false,
                    isValidating: false 
                }));

                if (onError) {
                    onError(errorMessage);
                }

                throw error;
            }
        };

        if (immediate) {
            return executeCalculation();
        } else {
            // Use debouncing for auto-calculations
            debounceTimeoutRef.current = setTimeout(executeCalculation, debounceMs);
        }
    }, [performCalculation, debounceMs, onSuccess, onError]);

    /**
     * Auto-calculate rate when dependencies change
     */
    const autoCalculate = useCallback((request: RateCalculationRequest) => {
        if (!enableAutoCalculate) return;

        const validationError = validateRequest(request);
        if (validationError) {
            setState(prev => ({ ...prev, error: validationError, data: null }));
            return;
        }

        calculateRate(request);
    }, [enableAutoCalculate, validateRequest, calculateRate]);

    /**
     * Manual calculate untuk immediate execution
     */
    const calculateRateImmediate = useCallback((request: RateCalculationRequest) => {
        return calculateRate(request, { immediate: true });
    }, [calculateRate]);

    /**
     * Refresh rate calculation (skip cache)
     */
    const refreshRate = useCallback((request: RateCalculationRequest) => {
        return calculateRate(request, { immediate: true, skipCache: true });
    }, [calculateRate]);

    /**
     * Clear cache untuk property tertentu
     */
    const clearPropertyCache = useCallback((propertySlug: string) => {
        cache.clearProperty(propertySlug);
    }, [cache]);

    /**
     * Clear semua cache
     */
    const clearAllCache = useCallback(() => {
        cache.clear();
    }, [cache]);

    /**
     * Reset state
     */
    const reset = useCallback(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setState({
            data: null,
            loading: false,
            error: null,
            isValidating: false
        });
    }, []);

    /**
     * Cleanup effect
     */
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    /**
     * Computed values untuk convenience
     */
    const computedValues = useMemo(() => ({
        // Basic values
        totalAmount: state.data?.calculation.total_amount || 0,
        formattedTotal: state.data?.formatted.total_amount || '',
        perNightAmount: state.data?.calculation.summary.average_nightly_rate || 0,
        formattedPerNight: state.data?.formatted.per_night || '',
        nights: state.data?.calculation.nights || 0,
        
        // Breakdown values
        hasWeekendPremium: (state.data?.calculation.weekend_premium || 0) > 0,
        hasSeasonalPremium: (state.data?.calculation.seasonal_premium || 0) > 0,
        hasExtraBeds: (state.data?.calculation.extra_beds || 0) > 0,
        hasDiscount: (state.data?.calculation.minimum_stay_discount || 0) > 0,
        
        // Status
        isReady: !!state.data && !state.loading && !state.error,
        isEmpty: !state.data && !state.loading && !state.error,
        isCalculating: state.loading || state.isValidating
    }), [state]);

    return {
        // State
        ...state,
        
        // Actions
        calculateRate: autoCalculate,
        calculateRateImmediate,
        refreshRate,
        reset,
        
        // Cache management
        clearPropertyCache,
        clearAllCache,
        
        // Computed values
        ...computedValues,
        
        // Utilities
        validateRequest
    };
}

/**
 * Helper hook untuk property-specific rate calculation
 */
export function usePropertyRateCalculator(
    propertySlug: string,
    options: UseRateCalculatorOptions = {}
) {
    const rateCalculator = useRateCalculator(options);
    
    const calculateForProperty = useCallback((
        checkIn: string,
        checkOut: string,
        guestCount?: number
    ) => {
        return rateCalculator.calculateRate({
            propertySlug,
            checkIn,
            checkOut,
            guestCount
        });
    }, [rateCalculator.calculateRate, propertySlug]);
    
    const calculateImmediate = useCallback((
        checkIn: string,
        checkOut: string,
        guestCount?: number
    ) => {
        return rateCalculator.calculateRateImmediate({
            propertySlug,
            checkIn,
            checkOut,
            guestCount
        });
    }, [rateCalculator.calculateRateImmediate, propertySlug]);
    
    const refresh = useCallback((
        checkIn: string,
        checkOut: string,
        guestCount?: number
    ) => {
        return rateCalculator.refreshRate({
            propertySlug,
            checkIn,
            checkOut,
            guestCount
        });
    }, [rateCalculator.refreshRate, propertySlug]);
    
    return {
        ...rateCalculator,
        calculateRate: calculateForProperty,
        calculateRateImmediate: calculateImmediate,
        refreshRate: refresh,
        clearCache: () => rateCalculator.clearPropertyCache(propertySlug)
    };
}

export default useRateCalculator; 
