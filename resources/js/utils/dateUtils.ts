import { AvailabilityData } from "@/lib/api";

export const formatTime = (time: string): string => {
  if (!time) return '-';

  // If it's a simple time string like "14:00:00" or "14:00", just return HH:mm
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {
    return time.slice(0, 5);
  }

  // If it's an ISO string containing 'T', extract the time part directly
  // This avoids timezone issues where 14:00 UTC becomes 21:00 WIB
  const timeMatch = time.match(/T(\d{2}:\d{2})/);
  if (timeMatch) {
    return timeMatch[1];
  }

  try {
    // Try parsing as a full date string first (e.g. ISO string)
    let date = new Date(time);

    // If invalid, try appending to a dummy date (for simple time strings that might have failed regex)
    if (isNaN(date.getTime())) {
      date = new Date(`2000-01-01T${time}`);
    }

    if (isNaN(date.getTime())) return time; // Return original if parsing fails

    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\./g, ':'); // Ensure colon separator
  } catch (e) {
    return time;
  }
};

export const getMaxSelectableDate = (availabilityData: AvailabilityData): string => {
  return availabilityData?.date_range?.end ||
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
};