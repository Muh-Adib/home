import { useMemo } from 'react';
import { AvailabilityData, PropertyWithDetails } from '@/types/property';
import { addDays, format, parseISO, isBefore } from 'date-fns';

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

    const checkIn = parseISO(checkInDate);
    const checkOut = parseISO(checkOutDate);
    const bookedDates = availabilityData?.booked_dates || [];
    
    const isDateBooked = (date: Date): boolean => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return bookedDates.includes(dateStr);
    };

    // Pengecekan booking yang sudah ada (sandwiched between bookings)
    const checkInNextDay = addDays(checkIn, 1);
    if (isDateBooked(checkInNextDay)) {
      return {
        minStay: 1,
        reason: 'sandwiched_between_bookings',
        seasonalRateApplied: null
      };
    }

    // Kumpulkan semua seasonal rates dalam rentang tanggal
    const seasonalRatesWithMinStay: Array<{
      name: string;
      min_stay_nights: number;
      dates: string[];
    }> = [];
    
    let maxSeasonalMinStay = 0;
    let appliedSeasonalRates: any[] = [];
    
    // Loop melalui semua tanggal dari check-in sampai check-out (exclusive)
    const currentDate = new Date(checkIn);
    while (isBefore(currentDate, checkOut)) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dateRate = availabilityData?.rates?.[dateStr];
      
      // Jika ada seasonal rate untuk tanggal ini
      if (dateRate?.seasonal_rate_applied && Array.isArray(dateRate.seasonal_rate_applied) && dateRate.seasonal_rate_applied.length > 0) {
        dateRate.seasonal_rate_applied.forEach((seasonalRate: any) => {
          // Periksa apakah min_stay_nights ada dan valid
          // Jika min_stay_nights null/undefined, gunakan 0 sebagai default (tidak ada minimum stay requirement)
          const minStayNights = seasonalRate?.min_stay_nights ?? null;
          
          // Jika ada seasonal rate, selalu track (meskipun min_stay_nights null/0)
          // Tapi hanya gunakan untuk minimum stay calculation jika > 0
          if (minStayNights !== null && minStayNights > 0) {
            // Cari apakah seasonal rate ini sudah ada di array
            const existingRate = seasonalRatesWithMinStay.find(r => r.name === seasonalRate.name);
            
            if (existingRate) {
              // Update min_stay_nights jika lebih tinggi
              if (minStayNights > existingRate.min_stay_nights) {
                existingRate.min_stay_nights = minStayNights;
              }
              // Tambahkan tanggal ke seasonal rate yang sudah ada
              if (!existingRate.dates.includes(dateStr)) {
                existingRate.dates.push(dateStr);
              }
            } else {
              // Tambahkan seasonal rate baru
              seasonalRatesWithMinStay.push({
                name: seasonalRate.name,
                min_stay_nights: minStayNights,
                dates: [dateStr]
              });
              appliedSeasonalRates.push(seasonalRate);
            }
            
            // Update maximum minimum stay
            if (minStayNights > maxSeasonalMinStay) {
              maxSeasonalMinStay = minStayNights;
            }
          } else if (minStayNights === null || minStayNights === 0) {
            // Seasonal rate ada tapi tidak ada minimum stay requirement
            // Masih perlu track untuk display, tapi tidak mempengaruhi minimum stay calculation
            const existingRate = seasonalRatesWithMinStay.find(r => r.name === seasonalRate.name);
            if (!existingRate) {
              appliedSeasonalRates.push(seasonalRate);
            }
          }
        });
      }
      
      // Pindah ke tanggal berikutnya
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Jika ada seasonal rate dengan minimum stay, gunakan yang tertinggi
    if (maxSeasonalMinStay > 0) {
      return {
        minStay: maxSeasonalMinStay,
        reason: 'seasonal_rate',
        seasonalRateApplied: appliedSeasonalRates
      };
    }

    // Jika tidak ada seasonal rate, cek apakah ada weekend dalam rentang tanggal
    const checkInDay = checkIn.getDay();
    const isWeekend = checkInDay === 5 || checkInDay === 6 || checkInDay === 0; // Jumat, Sabtu, Minggu
    
    // Cek apakah ada weekend dalam seluruh rentang
    let hasWeekendInRange = isWeekend;
    if (!hasWeekendInRange) {
      const checkDate = new Date(checkIn);
      while (isBefore(checkDate, checkOut)) {
        const day = checkDate.getDay();
        if (day === 5 || day === 6 || day === 0) {
          hasWeekendInRange = true;
          break;
        }
        checkDate.setDate(checkDate.getDate() + 1);
      }
    }
    
    return {
      minStay: hasWeekendInRange ? property.min_stay_weekend : property.min_stay_weekday,
      reason: hasWeekendInRange ? 'weekend' : 'weekday',
      seasonalRateApplied: null
    };
  }, [checkInDate, checkOutDate, availabilityData, property]);
};