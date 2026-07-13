import { type Amenity } from '@/types';
export interface Property {
  id: number;
  name: string;
  type: 'homestay' | 'villa' | 'apartment' | 'hotel';
  slug: string;
  description: string;
  address: string;
  maps_link?: string;
  tiktok_video_url?: string;
  lat?: number;
  lng?: number;
  capacity: number;
  capacity_max: number;
  check_in_time: string;
  check_out_time: string;
  bedroom_count: number;
  bathroom_count: number;
  base_rate: number;
  formatted_base_rate: string;
  weekend_premium_percent: number;
  weekend_premium_type?: 'percentage' | 'fixed';
  weekend_premium_fixed?: number;
  cleaning_fee: number;
  extra_bed_rate: number;
  house_rules?: string;

  min_stay_weekday: number;
  min_stay_weekend: number;
  min_stay_peak: number;
  is_featured: boolean;
  color?: string;
  short_name?: string;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  amenities: Amenity[];
  media: PropertyMedia[];
  // Rate calculation data from backend
  current_rate_calculation?: {
    nights: number;
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    cleaning_fee: number;
    extra_bed_amount: number;
    seasonal_premium: number;
    weekend_premium: number;
    extra_beds: number;
    rate_breakdown: {
      seasonal_rates_applied: Array<{
        name: string;
        description: string;
        dates: string[];
      }>;
    };
  };
  current_total_rate?: number;
  current_rate_per_night?: number;
  formatted_current_rate?: string;
  approved_reviews_count?: number;
  rating_avg?: number;
  approved_reviews?: any[];
  has_seasonal_rate?: boolean;
  seasonal_rate_info?: Array<{
    name: string;
    description: string;
    dates?: string[];
  }>;
}


export interface PropertyMedia {
  id: number;
  property_id: number;
  file_name: string;
  file_path: string;
  file_type: 'image' | 'video' | 'document';
  mime_type: string;
  media_type: 'image' | 'video';
  alt_text?: string;
  description?: string;
  display_order: number;
  is_featured: boolean;
  url: string;
  thumbnail_url?: string;
}


export interface PropertyWithDetails extends Property {
  owner: any;
  amenities: Amenity[];
  media: PropertyMedia[];
  seasonalRates?: any[];
  bookedDates: any[];
  tiktok_video_url?: string;
}

export interface AvailabilityData {
  success: boolean;
  property_id: string;
  date_range: {
    start: string;
    end: string;
  };
  guest_count: number;
  booked_dates: string[];
  booked_periods: string[][];
  rates: Record<string, {
    base_rate: number;
    final_rate: number;
    weekend_premium_amount: number;
    seasonal_premium_amount: number;
    seasonal_rate_applied?: {
      name: string;
      rate_type: string;
      rate_value: number;
      description: string;
      min_stay_nights: number;
    }[];
    is_weekend: boolean;
    has_seasonal_rate: boolean;
    extra_bed_rate: number;
  }>;
  property_info: {
    base_rate: number;
    capacity: number;
    capacity_max: number;
    cleaning_fee: number;
    extra_bed_rate: number;
    weekend_premium_percent: number;
    weekend_premium_type?: 'percentage' | 'fixed';
    weekend_premium_fixed?: number;
  };
}

export interface SearchParams {
  check_in: string;
  check_out: string;
  guests: number;
}