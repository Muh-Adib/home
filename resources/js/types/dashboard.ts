export interface KPIData {
    value: number;
    change: number;
    trend: 'up' | 'down';
    label: string;
    prefix?: string;
    suffix?: string;
    verifications?: number;
    payments?: number;
}

export interface QuickStats {
    total_properties: number;
    active_properties: number;
    current_guests: number;
    upcoming_arrivals: number;
}

export interface RecentActivity {
    id: number;
    type: 'booking' | 'payment';
    title: string;
    description: string;
    time: string;
    status: string;
    icon: string;
    href: string;
}

export interface TodayAgenda {
    type: 'check_in' | 'check_out' | 'verification';
    title: string;
    description: string;
    time: string | null;
    booking_number?: string;
    booking_id: number;
    status: string;
}

export interface RevenueChart {
    month: string;
    revenue: number;
    month_short: string;
}

export interface BookingTrend {
    date: string;
    day: string;
    bookings: number;
}

export interface PropertyPerformance {
    id: number;
    name: string;
    total_bookings: number;
    total_revenue: number;
    occupancy_rate: number;
}

export interface GuestBooking {
    id: number;
    booking_number: string;
    property: {
        name: string;
        address: string;
    };
    check_in: string;
    check_out: string;
    guest_count: number;
    total_amount: number;
    can_show_instructions: boolean;
    checkin_instructions: {
        welcome?: string;
        keybox_location?: string;
        keybox_code?: string;
        checkin_time?: string;
        emergency_contact?: string;
        additional_info?: string[];
    } | null;
    status: string;
    payment_status: string;
}

export interface DashboardData {
    kpis: {
        revenue: KPIData;
        bookings: KPIData;
        occupancy: KPIData;
        pending_actions: KPIData;
    };
    recentActivity: RecentActivity[];
    todaysAgenda: TodayAgenda[];
    quickStats: QuickStats;
    revenueChart: RevenueChart[];
    bookingTrends: BookingTrend[];
    propertyPerformance: PropertyPerformance[];
    upcomingBookings?: GuestBooking[];
}
