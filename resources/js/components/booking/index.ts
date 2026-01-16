/**
 * Booking Components Index
 * Central export point for all booking-related components
 */

// Existing components (already modular)
export { default as GuestCountForm } from './GuestCountForm';
export { default as RateBreakdownCard } from './RateBreakdownCard';
export { default as PrimaryGuestForm } from './PrimaryGuestForm';

// New modular components (optimized with React.memo)
export { default as PropertySelector } from './PropertySelector';
export { default as DateRangeWithAvailability } from './DateRangeWithAvailability';
export { default as GuestInformationForm } from './GuestInformationForm';
export { default as BookingStatusSection } from './BookingStatusSection';
export { default as PaymentFormSection } from './PaymentFormSection';
export { default as RateOverrideSection } from './RateOverrideSection';
export { default as BookingSummaryCard } from './BookingSummaryCard';

// Additional components used in BookingsIndex
export { default as BookingCard } from './BookingCard';
export { default as BookingTimeline } from './BookingTimeline';
export { default as BookingStats } from './BookingStats';
export { default as BookingFilters } from './BookingFilters';
export { default as ViewModeToggle } from './ViewModeToggle';
export { default as GuestSearchBar } from './GuestSearchBar';
export { default as BookingSearchBar } from './BookingSearchBar';
export { default as SearchResultsModal } from './SearchResultsModal';
export { default as BookingActionsMenu } from './BookingActionsMenu';

// Re-export types for convenience
export type {
    GuestFormData,
    PropertySelectorProps,
    DateRangeWithAvailabilityProps,
    GuestInformationFormProps,
    BookingStatusSectionProps,
    PaymentFormSectionProps,
    BookingSummaryCardProps,
} from '@/types/booking-form.types';