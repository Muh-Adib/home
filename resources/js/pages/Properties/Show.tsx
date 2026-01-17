import React, { useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/layouts/guest-layout';
import { useTranslation } from 'react-i18next';
import { PropertyGallery } from '@/components/property/PropertyGallery';
import { BookingSidebar } from '@/components/property/BookingSidebar';
import { PropertyHeader } from '@/components/property/PropertyHeader';
import { PropertyTabs } from '@/components/property/PropertyTabs';
import { SimilarProperties } from '@/components/property/SimilarProperties';
import { SeoHead } from '@/components/seo/SeoHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { FAQSection } from '@/components/seo/FAQSection';
import { usePropertyState } from '@/hooks/use-property-state';
import { useRateCalculation } from '@/hooks/use-rate-calculation';
import { usePropertyMinimumStay } from '@/hooks/use-property-minimum-stay';
import { formatTime, getMaxSelectableDate } from '@/utils/dateUtils';
import { type PageProps } from '@/types';
import { PropertyWithDetails, AvailabilityData, SearchParams, Property } from '@/types/property';

interface PropertyShowProps extends PageProps {
  property: PropertyWithDetails;
  similarProperties: Property[];
  searchParams: SearchParams;
  availabilityData: AvailabilityData;
}

export default function PropertyShow({
  property,
  similarProperties,
  searchParams,
  availabilityData,
  auth
}: PropertyShowProps) {
  const { t } = useTranslation();

  // State management
  const { state, actions, computed } = usePropertyState({
    initialGuestCount: searchParams.guests || 2,
    initialCheckIn: searchParams.check_in || '',
    initialCheckOut: searchParams.check_out || ''
  });

  // Rate calculation
  const {
    rateCalculation,
    rateError,
    isCalculatingRate,
    calculateRate,
    hasSeasonalPremium,
    hasWeekendPremium,
    isRateReady
  } = useRateCalculation({
    availabilityData,
    guestCount: state.guestCount
  });

  // Minimum stay calculation
  const effectiveMinStay = usePropertyMinimumStay({
    property,
    availabilityData,
    checkInDate: state.checkInDate,
    checkOutDate: state.checkOutDate
  });

  // Derived values
  const maxSelectableDate = getMaxSelectableDate(availabilityData);
  const images = property.media?.filter(m => m.media_type === 'image') || [];
  const meetsMinimumStay = computed.nights >= effectiveMinStay.minStay;

  // Initial rate calculation when searchParams are provided
  useEffect(() => {
    if (searchParams.check_in && searchParams.check_out && availabilityData) {
      console.log('Initial rate calculation from searchParams:', {
        checkIn: searchParams.check_in,
        checkOut: searchParams.check_out,
        guests: searchParams.guests || 2
      });
      calculateRate(searchParams.check_in, searchParams.check_out);
    }
  }, [searchParams.check_in, searchParams.check_out, searchParams.guests, availabilityData, calculateRate]);

  // Event handlers
  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    actions.setDateRange(startDate, endDate);
    if (startDate && endDate) {
      calculateRate(startDate, endDate);
    }
  }, [actions, calculateRate]);

  const handleGuestCountChange = useCallback((count: number) => {
    actions.setGuestCount(count);
    if (state.checkInDate && state.checkOutDate) {
      calculateRate(state.checkInDate, state.checkOutDate);
    }
  }, [actions, calculateRate, state.checkInDate, state.checkOutDate]);

  // URL update effect
  // ... existing code ...
  useEffect(() => {
    if (state.checkInDate && state.checkOutDate) {
      const url = new URL(window.location.href);
      url.searchParams.set('check_in', state.checkInDate);
      url.searchParams.set('check_out', state.checkOutDate);
      url.searchParams.set('guests', state.guestCount.toString());
      window.history.replaceState({}, '', url.toString());
    }
  }, [state.checkInDate, state.checkOutDate, state.guestCount]);

  return (
    <GuestLayout variant='minimal'>
      {/* SEO: Just 2 lines instead of 30! */}
      <SeoHead />
      <SchemaOrg />

      <div className="min-h-screen bg-brand-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

          <PropertyHeader property={property} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">

            {/* Main Content */}
            <div className="xl:col-span-2 space-y-8 relative">
              {/* Decorative background elements */}
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none"></div>

              {/* Image Gallery */}
              <div className="relative w-full overflow-hidden rounded-lg">
                <PropertyGallery
                  images={images}
                  currentIndex={state.currentImageIndex}
                  onImageChange={actions.setImageIndex}
                  propertyName={property.name}
                />
              </div>

              {/* Property Details Tabs */}
              <div className="relative">
                <PropertyTabs property={property} formatTime={formatTime} />
              </div>
            </div>

            {/* Booking Sidebar */}
            <BookingSidebar
              property={property}
              availabilityData={availabilityData}
              searchParams={searchParams}
              onDateRangeChange={handleDateRangeChange}
              onGuestCountChange={handleGuestCountChange}
              checkInDate={state.checkInDate}
              checkOutDate={state.checkOutDate}
              guestCount={state.guestCount}
              maxSelectableDate={maxSelectableDate}
              effectiveMinStay={effectiveMinStay}
              meetsMinimumStay={meetsMinimumStay}
              // Pass calculated rate data from parent
              rateCalculation={rateCalculation}
              rateError={rateError}
              isCalculatingRate={isCalculatingRate}
              hasSeasonalPremium={hasSeasonalPremium}
              hasWeekendPremium={hasWeekendPremium}
              isRateReady={isRateReady}
              // Pass auth data
              auth={auth}
            />
          </div>

          {/* GEO: FAQ Section for AI Optimization */}
          <div className="mt-16">
            <FAQSection className="bg-card p-8 rounded-lg shadow-sm" />
          </div>

          {/* Similar Properties - Full Width After Booking */}
          <div className="mt-16 relative">
            <SimilarProperties properties={similarProperties} />
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}