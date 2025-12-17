import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle } from 'lucide-react';
import { TodayAgenda as TodayAgendaType } from '@/types/dashboard';
import { Link } from '@inertiajs/react';

interface TodayAgendaProps {
    agenda: TodayAgendaType[];
}

export function TodayAgenda({ agenda }: TodayAgendaProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <div className="p-2 bg-green-50 rounded-lg">
                        <Clock className="w-4 h-4 text-green-600" />
                    </div>
                    Today's Agenda
                </CardTitle>
                <CardDescription>Upcoming tasks and events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {agenda.slice(0, 5).map((item, index) => {
                    const content = (
                        <>
                            <div className="flex-shrink-0 mt-0.5">
                                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 ring-4 ring-green-50" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-sm font-medium text-gray-900">
                                        {item.title}
                                    </p>
                                    {item.time && (
                                        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                            {item.time}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-1">
                                    {item.description}
                                </p>
                            </div>
                        </>
                    );

                    if (item.booking_number) {
                        return (
                            <Link
                                key={index}
                                href={`/admin/bookings/${item.booking_number}`}
                                className="flex items-start space-x-3 p-3 -mx-3 rounded-lg border border-transparent hover:bg-gray-50 transition-colors"
                            >
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-colors">
                            {content}
                        </div>
                    );
                })}
                {agenda.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                        No tasks for today
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
