import React from 'react';
import { formatDateShort, getDayName, isToday, isWeekend } from '@/utils/date';
import { cn } from '@/lib/utils';

interface BookingTimelineHeaderProps {
    dates: Date[];
    cellWidth?: number;
}

export default function BookingTimelineHeader({ dates, cellWidth = 120 }: BookingTimelineHeaderProps) {
    return (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex">
                {/* Empty cell for property names column */}
                <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-3">
                    <h3 className="text-sm font-semibold text-gray-700">Properties</h3>
                </div>
                
                {/* Timeline dates */}
                <div className="flex overflow-x-auto">
                    {dates.map((date, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex-shrink-0 border-r border-gray-200 p-2 text-center",
                                isToday(date) && "bg-blue-50 border-blue-200",
                                isWeekend(date) && "bg-orange-50"
                            )}
                            style={{ width: cellWidth }}
                        >
                            <div className="space-y-1">
                                <div className={cn(
                                    "text-xs font-medium",
                                    isToday(date) ? "text-blue-600" : "text-gray-500"
                                )}>
                                    {getDayName(date)}
                                </div>
                                <div className={cn(
                                    "text-sm font-semibold",
                                    isToday(date) ? "text-blue-600" : "text-gray-900"
                                )}>
                                    {formatDateShort(date)}
                                </div>
                                {isToday(date) && (
                                    <div className="text-xs text-blue-600 font-medium">
                                        Today
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 