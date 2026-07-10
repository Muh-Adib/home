import React from 'react';
import { formatDateShort, getDayName, isToday, isWeekend } from '@/utils/date';
import { cn } from '@/lib/utils';

interface BookingTimelineHeaderProps {
    dates: Date[];
    cellWidth?: number;
}

export default function BookingTimelineHeader({ dates, cellWidth = 60 }: BookingTimelineHeaderProps) {
    return (
        <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="flex">
                {/* Property names column (Sticky Left) */}
                <div className="w-24 sm:w-52 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-2 sm:p-3 sticky left-0 z-30 shadow-[1px_0_0_0_rgba(209,213,219,0.5)] overflow-hidden">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Properties</h3>
                </div>

                {/* Timeline dates */}
                <div className="flex">
                    {dates.map((date, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex-shrink-0 border-r p-2 text-center",
                                isToday(date) ? "bg-blue-50 border-blue-200" : (isWeekend(date) ? "bg-emerald-50 border-emerald-200" : "border-gray-200")
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
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 