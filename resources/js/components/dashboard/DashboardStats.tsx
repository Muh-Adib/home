import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    TrendingUp, TrendingDown, DollarSign, Calendar,
    Users, AlertCircle, Building2, Home, CreditCard,
    CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { DashboardData, QuickStats } from '@/types/dashboard';

interface StatItem {
    title: string;
    value: number | string;
    icon: any;
    color: string;
    bg: string;
    change?: number;
    trend?: 'up' | 'down';
    format?: 'currency' | 'percentage';
}

interface DashboardStatsProps {
    user: User;
    kpis: DashboardData['kpis'];
    quickStats: QuickStats;
}

export function DashboardStats({ user, kpis, quickStats }: DashboardStatsProps) {
    const getStatsForRole = (role: User['role']): StatItem[] => {
        const baseStats: StatItem[] = [
            {
                title: 'Total Properties',
                value: quickStats.total_properties,
                icon: Building2,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
            },
            {
                title: 'Active Properties',
                value: quickStats.active_properties,
                icon: Home,
                color: 'text-green-600',
                bg: 'bg-green-50',
            },
        ];

        const roleStats: Record<User['role'], StatItem[]> = {
            super_admin: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Total Bookings',
                    value: kpis.bookings.value,
                    icon: Calendar,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    change: kpis.bookings.change,
                    trend: kpis.bookings.trend,
                },
                {
                    title: 'Occupancy Rate',
                    value: kpis.occupancy.value,
                    icon: TrendingUp,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    format: 'percentage',
                    change: kpis.occupancy.change,
                    trend: kpis.occupancy.trend,
                },
                {
                    title: 'Pending Actions',
                    value: kpis.pending_actions.value,
                    icon: AlertCircle,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                },
            ],
            property_owner: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Occupancy Rate',
                    value: kpis.occupancy.value,
                    icon: TrendingUp,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    format: 'percentage',
                    change: kpis.occupancy.change,
                    trend: kpis.occupancy.trend,
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                ...baseStats,
            ],
            property_manager: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Pending Actions',
                    value: kpis.pending_actions.value,
                    icon: CreditCard,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                ...baseStats,
            ],
            front_desk: [
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
                {
                    title: 'Upcoming Arrivals',
                    value: quickStats.upcoming_arrivals,
                    icon: CheckCircle,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                },
                ...baseStats,
            ],
            finance: [
                {
                    title: 'Monthly Revenue',
                    value: kpis.revenue.value,
                    icon: DollarSign,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    format: 'currency',
                    change: kpis.revenue.change,
                    trend: kpis.revenue.trend,
                },
                {
                    title: 'Pending Payments',
                    value: kpis.pending_actions.payments || 0,
                    icon: CreditCard,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                },
            ],
            housekeeping: [
                {
                    title: 'Active Properties',
                    value: quickStats.active_properties,
                    icon: Home,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                },
                {
                    title: 'Current Guests',
                    value: quickStats.current_guests,
                    icon: Users,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                },
            ],
            guest: [
                {
                    title: 'Upcoming Trips',
                    value: quickStats.upcoming_arrivals,
                    icon: Calendar,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                },
                {
                    title: 'Available Properties',
                    value: quickStats.active_properties,
                    icon: Building2,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                },
            ],
        };

        return roleStats[role] || baseStats;
    };

    const userStats = getStatsForRole(user.role);

    const formatValue = (value: number | string, format?: string) => {
        const numericValue = Number(value);
        switch (format) {
            case 'currency':
                if (isNaN(numericValue)) return value;
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(numericValue);
            case 'percentage':
                return `${numericValue}%`;
            default:
                return numericValue.toLocaleString('id-ID');
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"
        >
            {userStats.map((stat, index) => {
                const Icon = stat.icon;
                const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
                const trendColor = stat.trend === 'up' ? 'text-green-600' : 'text-red-600';

                return (
                    <motion.div variants={item} key={index}>
                        <Card className="hover:shadow-md transition-shadow h-full border-l-4 border-l-primary/20">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs md:text-sm font-medium text-muted-foreground line-clamp-1">
                                            {stat.title}
                                        </p>
                                        <p className="text-lg md:text-2xl font-bold tracking-tight">
                                            {formatValue(stat.value, stat.format)}
                                        </p>
                                        {stat.change !== undefined && (
                                            <div className={`flex items-center gap-1 text-xs ${trendColor} font-medium`}>
                                                <TrendIcon className="h-3 w-3" />
                                                <span>{Math.abs(stat.change)}% from last month</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-2 rounded-xl ${stat.bg} shadow-sm`}>
                                        <Icon className={`h-5 w-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
