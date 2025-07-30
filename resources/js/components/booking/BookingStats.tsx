import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Calendar, 
    Users, 
    Building2, 
    DollarSign,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    Clock,
    XCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BookingStatsProps {
    statistics: {
        total_bookings: number;
        confirmed_bookings: number;
        pending_bookings: number;
        cancelled_bookings: number;
        total_revenue: number;
        pending_revenue: number;
        check_ins_today: number;
        check_outs_today: number;
    };
}

export default function BookingStats({ statistics }: BookingStatsProps) {
    const stats = [
        {
            title: 'Total Bookings',
            value: statistics.total_bookings,
            icon: Calendar,
            color: 'bg-blue-500',
            trend: 'up',
            change: '+12%'
        },
        {
            title: 'Confirmed',
            value: statistics.confirmed_bookings,
            icon: CheckCircle,
            color: 'bg-green-500',
            trend: 'up',
            change: '+8%'
        },
        {
            title: 'Pending',
            value: statistics.pending_bookings,
            icon: Clock,
            color: 'bg-yellow-500',
            trend: 'down',
            change: '-5%'
        },
        {
            title: 'Cancelled',
            value: statistics.cancelled_bookings,
            icon: XCircle,
            color: 'bg-red-500',
            trend: 'down',
            change: '-2%'
        },
        {
            title: 'Total Revenue',
            value: formatCurrency(statistics.total_revenue),
            icon: DollarSign,
            color: 'bg-emerald-500',
            trend: 'up',
            change: '+15%'
        },
        {
            title: 'Check-ins Today',
            value: statistics.check_ins_today,
            icon: Users,
            color: 'bg-blue-600',
            trend: 'up',
            change: '+3'
        },
        {
            title: 'Check-outs Today',
            value: statistics.check_outs_today,
            icon: Building2,
            color: 'bg-purple-500',
            trend: 'down',
            change: '-1'
        },
        {
            title: 'Pending Revenue',
            value: formatCurrency(statistics.pending_revenue),
            icon: TrendingUp,
            color: 'bg-orange-500',
            trend: 'up',
            change: '+22%'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                        {stat.title}
                                    </p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stat.value}
                                    </p>
                                    <div className="flex items-center gap-1 mt-2">
                                        {stat.trend === 'up' ? (
                                            <TrendingUp className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3 text-red-500" />
                                        )}
                                        <span className={`text-xs font-medium ${
                                            stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {stat.change}
                                        </span>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                                    <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
} 