import { useMemo } from 'react';
import { AvailabilityData, PropertyWithDetails } from '@/types/property';

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
    
    if (checkInRate && checkInRate.seasonal_premium > 0 && checkInRate.seasonal_rate_applied) {
      return {
        minStay: checkInRate.seasonal_rate_applied[0].min_stay_nights,
        reason: 'seasonal_rate',
        seasonalRateApplied: checkInRate.seasonal_rate_applied
      };
    }

    const isWeekend = checkIn.getDay() === 0 || checkIn.getDay() === 6;
    return {
      minStay: isWeekend ? property.min_stay_weekend : property.min_stay_weekday,
      reason: isWeekend ? 'weekend' : 'weekday',
      seasonalRateApplied: null
    };
  }, [checkInDate, checkOutDate, availabilityData, property]);
};