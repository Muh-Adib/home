import React, { useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { useTranslation } from 'react-i18next';
import { PropertyGallery } from '@/components/property/PropertyGallery';
import { BookingSidebar } from '@/components/property/BookingSidebar';
import { PropertyHeader } from '@/components/property/PropertyHeader';
import { PropertyTabs } from '@/components/property/PropertyTabs';
import { SimilarProperties } from '@/components/property/SimilarProperties';
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
  availabilityData 
}: PropertyShowProps) {
  const { t } = useTranslation();
  
  // State management
  const { state, actions, computed } = usePropertyState({
    initialGuestCount: searchParams.guests || 2,
    initialCheckIn: searchParams.check_in || '',
    initialCheckOut: searchParams.check_out || ''
  });

  // Rate calculation
  const { rateCalculation, rateError, isCalculatingRate, calculateRate } = useRateCalculation({
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
    <AppLayout>
      <Head title={property.name} />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          <PropertyHeader property={property} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-8">
              
              {/* Image Gallery */}
              <PropertyGallery
                images={images}
                currentIndex={state.currentImageIndex}
                onImageChange={actions.setImageIndex}
                propertyName={property.name}
              />

              {/* Property Details Tabs */}
              <PropertyTabs property={property} formatTime={formatTime} />

              {/* Similar Properties */}
              <SimilarProperties properties={similarProperties} />
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
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}