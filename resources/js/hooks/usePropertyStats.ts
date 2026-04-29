import { useQuery } from '@tanstack/react-query';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import { apiGet } from '@/lib/api';

export interface PropertyStatsData {
  kpis: {
    revenue_total: number;
    occupancy_rate: number;
    total_bookings: number;
    average_rating: number;
  };
  trend: Array<{
    date: string;
    revenue: number;
    occupancy: number;
  }>;
  breakdown: {
    source: Record<string, number>;
  };
  bookings: Array<{
    id: number;
    booking_number: string;
    guest_name: string;
    check_in: string;
    check_out: string;
    status: string;
    total_amount: number;
  }>;
}

interface UsePropertyStatsOptions {
  propertyId: string;
  from?: string;
  to?: string;
  period?: 'day' | 'week' | 'month';
  enabled?: boolean;
}

export function usePropertyStats({
  propertyId,
  from,
  to,
  period = 'day',
  enabled = true
}: UsePropertyStatsOptions) {
  
  const fetchStats = useCallback(async (): Promise<PropertyStatsData> => {
    return apiGet<PropertyStatsData>(`/api/admin/properties/${propertyId}/stats`, {
      period,
      ...(from && { from }),
      ...(to && { to })
    });
  }, [propertyId, from, to, period]);

  const query = useQuery({
    queryKey: ['property-stats', propertyId, from, to, period],
    queryFn: fetchStats,
    enabled: enabled && !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const dateRangePresets = useMemo(() => [
    {
      label: 'This Month',
      value: 'this-month',
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          from: start.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'Last 3 Months',
      value: 'last-3-months',
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          from: start.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0]
        };
      }
    },
    {
      label: 'This Year',
      value: 'this-year',
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return {
          from: start.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0]
        };
      }
    }
  ], []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    dateRangePresets,
    formatCurrency,
    formatPercentage,
  };
}

