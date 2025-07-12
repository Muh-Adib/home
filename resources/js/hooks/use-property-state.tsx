import { useReducer, useCallback, useMemo } from 'react';

export interface PropertyState {
    currentImageIndex: number;
    guestCount: number;
    checkInDate: string;
    checkOutDate: string;
    activeTab: string;
    rateCalculation: any | null;
    rateError: string | null;
    isCalculatingRate: boolean;
}

export type PropertyAction = 
    | { type: 'SET_IMAGE_INDEX'; payload: number }
    | { type: 'SET_GUEST_COUNT'; payload: number }
    | { type: 'SET_DATE_RANGE'; payload: { checkIn: string; checkOut: string } }
    | { type: 'SET_ACTIVE_TAB'; payload: string }
    | { type: 'SET_RATE_CALCULATION'; payload: any | null }
    | { type: 'SET_RATE_ERROR'; payload: string | null }
    | { type: 'SET_CALCULATING_RATE'; payload: boolean }
    | { type: 'RESET_STATE' };

const initialState: PropertyState = {
    currentImageIndex: 0,
    guestCount: 2,
    checkInDate: '',
    checkOutDate: '',
    activeTab: 'overview',
    rateCalculation: null,
    rateError: null,
    isCalculatingRate: false
};

function propertyReducer(state: PropertyState, action: PropertyAction): PropertyState {
    switch (action.type) {
        case 'SET_IMAGE_INDEX':
            return {
                ...state,
                currentImageIndex: action.payload
            };
        
        case 'SET_GUEST_COUNT':
            return {
                ...state,
                guestCount: action.payload
            };
        
        case 'SET_DATE_RANGE':
            return {
                ...state,
                checkInDate: action.payload.checkIn,
                checkOutDate: action.payload.checkOut,
                // Clear rate calculation when dates change
                rateCalculation: null,
                rateError: null
            };
        
        case 'SET_ACTIVE_TAB':
            return {
                ...state,
                activeTab: action.payload
            };
        
        case 'SET_RATE_CALCULATION':
            return {
                ...state,
                rateCalculation: action.payload,
                rateError: null
            };
        
        case 'SET_RATE_ERROR':
            return {
                ...state,
                rateError: action.payload,
                rateCalculation: null
            };
        
        case 'SET_CALCULATING_RATE':
            return {
                ...state,
                isCalculatingRate: action.payload
            };
        
        case 'RESET_STATE':
            return initialState;
        
        default:
            return state;
    }
}

interface UsePropertyStateProps {
    initialGuestCount?: number;
    initialCheckIn?: string;
    initialCheckOut?: string;
}

export function usePropertyState({ 
    initialGuestCount = 2, 
    initialCheckIn = '', 
    initialCheckOut = '' 
}: UsePropertyStateProps = {}) {
    const [state, dispatch] = useReducer(propertyReducer, {
        ...initialState,
        guestCount: initialGuestCount,
        checkInDate: initialCheckIn,
        checkOutDate: initialCheckOut
    });

    // Action creators
    const setImageIndex = useCallback((index: number) => {
        dispatch({ type: 'SET_IMAGE_INDEX', payload: index });
    }, []);

    const setGuestCount = useCallback((count: number) => {
        dispatch({ type: 'SET_GUEST_COUNT', payload: count });
    }, []);

    const setDateRange = useCallback((checkIn: string, checkOut: string) => {
        dispatch({ type: 'SET_DATE_RANGE', payload: { checkIn, checkOut } });
    }, []);

    const setActiveTab = useCallback((tab: string) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    }, []);

    const setRateCalculation = useCallback((calculation: any | null) => {
        dispatch({ type: 'SET_RATE_CALCULATION', payload: calculation });
    }, []);

    const setRateError = useCallback((error: string | null) => {
        dispatch({ type: 'SET_RATE_ERROR', payload: error });
    }, []);

    const setCalculatingRate = useCallback((isCalculating: boolean) => {
        dispatch({ type: 'SET_CALCULATING_RATE', payload: isCalculating });
    }, []);

    const resetState = useCallback(() => {
        dispatch({ type: 'RESET_STATE' });
    }, []);

    // Computed values
    const hasValidDates = useMemo(() => {
        return !!(state.checkInDate && state.checkOutDate);
    }, [state.checkInDate, state.checkOutDate]);

    const nights = useMemo(() => {
        if (!hasValidDates) return 0;
        
        const fromDate = new Date(state.checkInDate);
        const toDate = new Date(state.checkOutDate);
        return Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    }, [state.checkInDate, state.checkOutDate, hasValidDates]);

    const isRateReady = useMemo(() => {
        return !!(state.rateCalculation && !state.rateError);
    }, [state.rateCalculation, state.rateError]);

    return {
        state,
        dispatch,
        actions: {
            setImageIndex,
            setGuestCount,
            setDateRange,
            setActiveTab,
            setRateCalculation,
            setRateError,
            setCalculatingRate,
            resetState
        },
        computed: {
            hasValidDates,
            nights,
            isRateReady
        }
    };
} 