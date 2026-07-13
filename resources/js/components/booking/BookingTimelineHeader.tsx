import React from 'react';
import { formatDateShort, getDayName, isToday, isWeekend } from '@/utils/date';
import { cn } from '@/lib/utils';

interface BookingTimelineHeaderProps {
    dates: Date[];
    cellWidth?: number;
}

export default function BookingTimelineHeader({ dates, cellWidth = 60 }: BookingTimelineHeaderProps) {
    return (
        <div className="bg-white border-b border-gray-300 shadow-sm">
            <div className="flex">
                {/* Property names column (Sticky Left) */}
                <div className="sticky left-0 z-40 flex w-20 sm:w-52 flex-shrink-0 items-center justify-center border-r border-gray-300 bg-gray-50 px-2 py-3 shadow-[1px_0_0_0_rgba(209,213,219,0.5)]">
                    <h3 className="text-center text-xs sm:text-sm font-semibold text-gray-700">
                        Unit
                    </h3>
                </div>

                {/* Timeline dates */}
                <div className="flex">
                    {dates.map((date, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex-shrink-0 border-r p-2 text-center",
                                isToday(date) ? "bg-blue-50 border-blue-300" : (isWeekend(date) ? "bg-emerald-50 border-emerald-300" : "border-gray-300")
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