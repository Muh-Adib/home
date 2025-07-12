export const formatTime = (time: string): string => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  export const getMaxSelectableDate = (availabilityData: AvailabilityData): string => {
    return availabilityData?.date_range?.end || 
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  };