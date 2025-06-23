import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: 'super_admin' | 'property_owner' | 'property_manager' | 'front_desk' | 'finance' | 'housekeeping' | 'guest';
    status: 'active' | 'inactive' | 'suspended';
    avatar?: string;
    last_login_at?: string;
    email_verified_at?: string;
    created_at: string;
    updated_at: string;
    profile?: UserProfile;
}

export interface UserProfile {
    id: number;
    user_id: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    birth_date?: string;
    gender?: 'male' | 'female' | 'other';
    bio?: string;
    created_at: string;
    updated_at: string;
}

export interface Property {
    id: number;
    owner_id: number;
    name: string;
    slug: string;
    description: string;
    address: string;
    lat?: number;
    lng?: number;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    base_rate: number;
    weekend_premium_percent?: number;
    cleaning_fee?: number;
    extra_bed_rate?: number;
    status: 'active' | 'inactive' | 'maintenance';
    amenities?: any;
    house_rules?: string;
    check_in_time: string;
    check_out_time: string;
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    is_featured: boolean;
    sort_order: number;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string;
    created_at: string;
    updated_at: string;
    owner?: User;
    media?: PropertyMedia[];
    coverImage?: PropertyMedia[];
    formatted_base_rate?: string;
}

export interface PropertyMedia {
    id: number;
    property_id: number;
    file_name: string;
    file_path: string;
    file_type: 'image' | 'video' | 'document';
    file_size: number;
    mime_type: string;
    alt_text?: string;
    sort_order: number;
    is_featured: boolean;
    url: string;
    created_at: string;
    updated_at: string;
}

export interface Amenity {
    id: number;
    name: string;
    description?: string;
    icon?: string;
    category: 'basic' | 'kitchen' | 'bathroom' | 'entertainment' | 'outdoor' | 'safety';
    is_featured: boolean;
    created_at: string;
    updated_at: string;
}

export interface PropertyAmenity {
    id: number;
    property_id: number;
    amenity_id: number;
    is_available: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
    amenity?: Amenity;
}

export interface Booking {
    id: number;
    property_id: number;
    booking_number: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number: string;
    guest_gender: string;
    guest_count: number;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    check_in: string;
    check_out: string;
    nights: number;
    base_amount: number;
    extra_bed_amount: number;
    service_amount: number;
    tax_amount: number;
    dp_percentage: number;
    dp_amount: number;
    total_amount: number;
    remaining_amount: number;
    booking_status: 'pending_verification' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
    payment_status: 'dp_pending' | 'dp_received' | 'fully_paid' | 'overdue' | 'refunded';
    verification_status: 'pending' | 'approved' | 'rejected';
    special_requests?: string;
    cancellation_reason?: string;
    verified_by?: number;
    verified_at?: string;
    cancelled_by?: number;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
    property?: Property;
    guests?: BookingGuest[];
    services?: BookingService[];
    payments?: Payment[];
    workflow?: BookingWorkflow[];
}

export interface BookingGuest {
    id: number;
    booking_id: number;
    full_name: string;
    id_number?: string;
    age_category?: string;
    gender: 'male' | 'female';
    relationship_to_primary: string;
    phone?: string;
    email?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface BookingService {
    id: number;
    booking_id: number;
    service_name: string;
    service_type: 'extra_bed' | 'cleaning' | 'transport' | 'catering' | 'other';
    quantity: number;
    unit_price: number;
    total_price: number;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface BookingWorkflow {
    id: number;
    booking_id: number;
    step: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    processed_by?: number;
    processed_at?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    processor?: User;
}

export interface Payment {
    id: number;
    payment_number: string;
    booking_id: number;
    payment_method_id?: number;
    amount: number;
    payment_type: 'dp' | 'remaining' | 'full' | 'refund' | 'penalty' | 'additional' | 'damage' | 'cleaning' | 'extra_service';
    payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'e_wallet' | 'other';
    payment_date: string;
    due_date?: string;
    reference_number?: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
    payment_status: 'pending' | 'verified' | 'failed' | 'cancelled';
    verification_notes?: string;
    attachment_path?: string;
    processed_by?: number;
    verified_by?: number;
    verified_at?: string;
    gateway_transaction_id?: string;
    gateway_response?: any;
    created_at: string;
    updated_at: string;
    booking?: Booking;
    paymentMethod?: PaymentMethod;
    processor?: User;
    verifier?: User;
}

export interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    type: 'bank_transfer' | 'e_wallet' | 'credit_card' | 'cash';
    icon?: string;
    description?: string;
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    qr_code?: string;
    instructions?: string[];
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface PropertyExpense {
    id: number;
    property_id: number;
    expense_category: 'utilities' | 'maintenance' | 'supplies' | 'marketing' | 'insurance' | 'tax' | 'staff' | 'other';
    description: string;
    amount: number;
    expense_date: string;
    vendor?: string;
    receipt_path?: string;
    is_recurring: boolean;
    recurring_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    notes?: string;
    recorded_by: number;
    approved_by?: number;
    approved_at?: string;
    created_at: string;
    updated_at: string;
    property?: Property;
    recorder?: User;
    approver?: User;
}

export interface FinancialReport {
    id: number;
    property_id?: number;
    report_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    report_period: string;
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    occupancy_rate: number;
    adr: number;
    revpar: number;
    booking_count: number;
    guest_count: number;
    report_data?: any;
    generated_at: string;
    generated_by: number;
    created_at: string;
    updated_at: string;
    property?: Property;
    generator?: User;
}

// Form interfaces
export interface BookingFormData {
    property_id: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_count: number;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    check_in: string;
    check_out: string;
    dp_percentage: number;
    special_requests?: string;
    guests: Array<{
        name: string;
        age?: number;
        gender: 'male' | 'female';
        relationship: BookingGuest['relationship'];
        id_number?: string;
        phone?: string;
        email?: string;
    }>;
    services: Array<{
        service_name: string;
        service_type: BookingService['service_type'];
        quantity: number;
        unit_price: number;
        description?: string;
    }>;
}

export interface PropertyFormData {
    name: string;
    description: string;
    address: string;
    lat?: number;
    lng?: number;
    capacity: number;
    capacity_max: number;
    bedroom_count: number;
    bathroom_count: number;
    base_rate: number;
    weekend_premium_percent?: number;
    cleaning_fee?: number;
    extra_bed_rate?: number;
    status: Property['status'];
    is_featured: boolean;
    check_in_time: string;
    check_out_time: string;
    min_stay_weekday: number;
    min_stay_weekend: number;
    min_stay_peak: number;
    seo_title?: string;
    seo_description?: string;
    house_rules?: string;
    amenities: number[];
}

// Pagination interface
export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

// API Response interfaces
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: Record<string, string[]>;
}

// Breadcrumb interface
export interface BreadcrumbItem {
    title: string;
    href?: string;
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
};

// Cleaning Management Types
export interface CleaningStats {
    total_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completed_today: number;
    overdue_tasks: number;
}

export interface ChecklistItem {
    area: string;
    tasks: string[];
    completed: boolean;
    notes?: string;
}

export interface CleaningTask {
    id: number;
    property_id: number;
    booking_id?: number;
    assigned_to?: number;
    created_by: number;
    schedule_id?: number;
    task_number: string;
    title: string;
    description?: string;
    task_type: 'regular_cleaning' | 'deep_cleaning' | 'checkout_cleaning' | 'checkin_prep' | 'maintenance_cleaning' | 'emergency_cleaning' | 'inspection';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'pending' | 'assigned' | 'in_progress' | 'review_required' | 'completed' | 'cancelled';
    scheduled_date: string;
    estimated_duration: string;
    deadline?: string;
    cleaning_areas?: string[];
    checklist?: ChecklistItem[];
    special_instructions?: string;
    estimated_cost: number;
    completion_percentage: number;
    started_at?: string;
    completed_at?: string;
    completed_by?: number;
    completion_notes?: string;
    quality_rating?: number;
    reviewed_at?: string;
    reviewed_by?: number;
    review_notes?: string;
    created_at: string;
    updated_at: string;
    property?: Property;
    booking?: Booking;
    assigned_to_user?: User;
    created_by_user?: User;
    completed_by_user?: User;
    reviewed_by_user?: User;
    schedule?: CleaningSchedule;
    is_overdue?: boolean;
    task_type_name?: string;
    priority_name?: string;
    status_name?: string;
}

export interface CleaningSchedule {
    id: number;
    property_id: number;
    schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
    frequency: number;
    start_date: string;
    end_date: string;
    status: 'active' | 'inactive' | 'completed';
    created_at: string;
    updated_at: string;
}