import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, Activity } from 'lucide-react';
import { RecentActivity as RecentActivityType } from '@/types/dashboard';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@inertiajs/react';

interface RecentActivityProps {
    activities: RecentActivityType[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
    const getIconComponent = (iconName: string) => {
        const icons: Record<string, any> = {
            Calendar,
            DollarSign,
        };
        return icons[iconName] || Calendar;
    };

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                    Recent Activity
                </CardTitle>
                <CardDescription>Latest system activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {activities.slice(0, 5).map((activity, index) => (
                    <Link
                        key={index}
                        href={activity.href}
                        className="flex items-start space-x-4 group p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                {React.createElement(getIconComponent(activity.icon), {
                                    className: "h-4 w-4 text-blue-600"
                                })}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                {activity.title}
                            </p>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {activity.description}
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                            </p>
                        </div>
                    </Link>
                ))}
                {activities.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        No recent activity
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
