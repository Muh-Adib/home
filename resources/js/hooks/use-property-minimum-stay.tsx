import { useMemo } from 'react';
import { AvailabilityData, PropertyWithDetails } from '@/types/property';
import { addDays } from 'date-fns';

interface UsePropertyMinimumStayProps {
  property: PropertyWithDetails;
  availabilityData: AvailabilityData;
  checkInDate: string;
  checkOutDate: string;
}

export const usePropertyMinimumStay = ({ 
  property, 
  availabilityData, 
  checkInDate, 
  checkOutDate 
}: UsePropertyMinimumStayProps) => {
  return useMemo(() => {
    if (!checkInDate || !checkOutDate) {
      return {
        minStay: 1,
        reason: 'default',
        seasonalRateApplied: null
      };
    }

    const checkIn = new Date(checkInDate);
    const checkInDateStr = checkIn.toISOString().split('T')[0];
    const checkInRate = availabilityData?.rates?.[checkInDateStr]; 
    const bookedDates = availabilityData?.booked_dates;
    const isDateBooked = (date: Date): boolean => {
      const dateStr = date.toISOString().split('T')[0];
      return bookedDates?.includes(dateStr) || false;
    };

    //pengecekan booking yang sudah ada
    if (isDateBooked(addDays(checkInDateStr, 1))) {
      return {
        minStay: 1,
        reason: 'booked',
        seasonalRateApplied: null
      };
    }

    // Jika ada seasonal rate, return seasonal rate
    if (checkInRate && checkInRate.seasonal_premium > 0 && checkInRate.seasonal_rate_applied) {
      return {
        minStay: checkInRate.seasonal_rate_applied[0].min_stay_nights,
        reason: 'seasonal_rate',
        seasonalRateApplied: checkInRate.seasonal_rate_applied
      };
    }

    // Jika tidak ada seasonal rate, return weekend atau weekday
    const isWeekend = checkIn.getDay() === 5 || checkIn.getDay() === 6 || checkIn.getDay() === 0;
    return {
      minStay: isWeekend ? property.min_stay_weekend : property.min_stay_weekday,
      reason: isWeekend ? 'weekend' : 'weekday',
      seasonalRateApplied: null
    };
  }, [checkInDate, checkOutDate, availabilityData, property]);
};