import React from "react";
import { type Property, type Booking } from "@/types";
import {
    calculateBookingPosition,
    isBookingInRange,
    isToday,
} from "@/utils/date";
import BookingItem from "./BookingItem";

interface BookingTimelineRowProps {
    property: Property;
    bookings: Booking[];
    timelineDates: Date[];
    cellWidth?: number;
    rowHeight?: number;
    onBookingClick: (booking: Booking) => void;
}

export default function BookingTimelineRow({
    property,
    bookings,
    timelineDates,
    cellWidth = 60,
    rowHeight = 72,
    onBookingClick,
}: BookingTimelineRowProps) {
    const timelineStart = timelineDates[0];
    const timelineEnd = timelineDates[timelineDates.length - 1];

    const relevantBookings = bookings.filter((booking) =>
        isBookingInRange(booking, timelineStart, timelineEnd)
    );

    // property image
    const coverImage =
        property.media?.find((m) => m.file_type === "image" && m.is_featured)?.url ||
        property.media?.find((m) => m.file_type === "image")?.url;

    return (
        <div
            className="flex border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            style={{ height: rowHeight }}
        >

            {/* PROPERTY INFO (Sticky + compact + mobile friendly) */}
            <div
                className="
                    w-36 sm:w-52 flex-shrink-0 border-r border-gray-200 
                    p-2 sm:p-3 bg-white sticky left-0 z-30
                    shadow-[1px_0_0_0_rgba(209,213,219,0.5)]
                    overflow-hidden flex items-center
                "
                style={{ height: rowHeight }}
            >
                <div className="flex items-center gap-3">
                    {coverImage && (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                            <img
                                src={coverImage}
                                alt={property.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Name more visible but truncated */}
                    <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base truncate block">
                            {property.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* TIMELINE CELLS (compact & smooth scroll) */}
            <div className="flex relative overflow-hidden" style={{ height: rowHeight }}>
                {timelineDates.map((date, idx) => (
                    <div
                        key={idx}
                        className="relative border-r border-gray-200"
                        style={{
                            width: cellWidth,
                            height: "100%",
                        }}
                    >
                        {/* Weekend subtle background */}
                        {(date.getDay() === 0 || date.getDay() === 6) && (
                            <div className="absolute inset-0 bg-orange-100/20" />
                        )}

                        {/* Today highlight */}
                        {isToday(date) && (
                            <div className="absolute inset-0 bg-blue-200/20 ring-1 ring-blue-300/40" />
                        )}
                    </div>
                ))}

                {/* BOOKING ITEMS */}
                {relevantBookings.map((booking) => {
                    const pos = calculateBookingPosition(
                        booking,
                        timelineDates,
                        cellWidth
                    );

                    if (!pos.visible) return null;

                    return (
                        <div
                            key={booking.id}
                            className="absolute"
                            style={{
                                left: pos.left,
                                width: pos.width,
                                height: "100%", // Fill row height
                                zIndex: 20,
                            }}
                        >
                            <BookingItem
                                booking={booking}
                                width={pos.width}
                                nights={pos.nights}
                                onClick={onBookingClick}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
