import React, { useState } from "react";
import { type Property, type Booking } from "@/types";
import { cn } from "@/lib/utils";
import {
    calculateBookingPosition,
    isBookingInRange,
    isToday,
    isWeekend,
} from "@/utils/date";
import BookingItem from "./BookingItem";
import { Building2 } from "lucide-react";

interface BookingTimelineRowProps {
    property: Property;
    bookings: Booking[];
    timelineDates: Date[];
    cellWidth?: number;
    rowHeight?: number;
    onBookingClick: (booking: Booking) => void;
    onColorChange: (propertyId: number, color: string) => void;
    onShortNameChange: (propertyId: number, shortName: string) => void;
}

export default function BookingTimelineRow({
    property,
    bookings,
    timelineDates,
    cellWidth = 60,
    rowHeight = 72,
    onBookingClick,
    onColorChange,
    onShortNameChange,
}: BookingTimelineRowProps) {
    const timelineStart = timelineDates[0];
    const timelineEnd = timelineDates[timelineDates.length - 1];

    const relevantBookings = bookings.filter((booking) =>
        isBookingInRange(booking, timelineStart, timelineEnd)
    );

    // Get cover image URL from media, identical to property list
    const coverImage = property.media && property.media.length > 0 && property.media[0]?.url
        ? property.media[0].url
        : null;

    const [isEditingShortName, setIsEditingShortName] = useState(false);
    const [tempShortName, setTempShortName] = useState(property.short_name || "");

    const handleShortNameSubmit = () => {
        setIsEditingShortName(false);
        if (tempShortName.trim() !== (property.short_name || "")) {
            onShortNameChange(property.id, tempShortName.trim());
        }
    };

    const rowColorHex = property.color || "#3b82f6";
    // stronger row background (10% opacity)
    const rowBgColor = rowColorHex + "2e";

    return (
        <div
            className="flex border-b border-gray-300 transition-colors"
            style={{ 
                height: rowHeight,
                backgroundColor: rowBgColor
            }}
        >

            {/* PROPERTY INFO (Sticky + compact + mobile friendly) */}
            <div
                className="
                    w-20 sm:w-36 flex-shrink-0 border-r border-gray-300 
                    p-1.5 sm:p-3 sticky left-0 z-30
                    shadow-[1px_0_0_0_rgba(209,213,219,0.5)]
                    overflow-hidden flex items-center border-l-4
                "
                style={{ 
                    height: rowHeight,
                    backgroundColor: rowColorHex , // stronger background for sticky sidebar cell (18% opacity)
                    borderLeftColor: rowColorHex
                }}
            >
                <div className="flex items-center gap-1.5 sm:gap-2.5 w-full h-full">
                    {/* Compact custom color picker dot */}
                    <div className="hidden md:inline relative w-3.5 h-3.5 rounded-full overflow-hidden border border-slate-300 shrink-0 cursor-pointer hover:scale-110 transition-transform shadow-sm" title="Ubah warna baris properti">
                        <input
                            type="color"
                            value={rowColorHex}
                            onChange={(e) => onColorChange(property.id, e.target.value)}
                            className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer p-0 border-0 bg-transparent"
                        />
                    </div>

                    {/* Image and name vertical stack */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0 gap-1.5 py-0.5">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-50 rounded-md flex items-center justify-center overflow-hidden border border-slate-200/60 shrink-0 shadow-sm">
                            {coverImage ? (
                                <img
                                    src={coverImage}
                                    alt={property.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Building2 className="h-4 w-4 text-slate-400" />
                            )}
                        </div>

                        {isEditingShortName ? (
                            <input
                                type="text"
                                value={tempShortName}
                                onChange={(e) => setTempShortName(e.target.value)}
                                onBlur={handleShortNameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleShortNameSubmit();
                                    if (e.key === "Escape") {
                                        setTempShortName(property.short_name || "");
                                        setIsEditingShortName(false);
                                    }
                                }}
                                className="w-full text-[9px] sm:text-xs text-center border border-slate-300 rounded px-0.5 py-0 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                autoFocus
                            />
                        ) : (
                            <span 
                                className="font-semibold text-gray-900 text-[9px] sm:text-xs leading-none w-full truncate block px-0.5 cursor-pointer hover:underline bg-white/70 border border-slate-200/60 rounded" 
                                title="Klik dua kali untuk ubah nama singkat"
                                onDoubleClick={() => {
                                    setTempShortName(property.short_name || "");
                                    setIsEditingShortName(true);
                                }}
                            >
                                {property.short_name || property.name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* TIMELINE CELLS (compact & smooth scroll) */}
            <div className="flex relative overflow-hidden" style={{ height: rowHeight }}>
                {timelineDates.map((date, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "relative border-r",
                            isWeekend(date) ? "border-emerald-300" : "border-gray-300"
                        )}
                        style={{
                            width: cellWidth,
                            height: "100%",
                        }}
                    >
                        {/* Weekend background (layered/stacking on top of property color) */}
                        {isWeekend(date) && (
                            <div className="absolute inset-0 bg-emerald-100/40" />
                        )}

                        {/* Today highlight */}
                        {isToday(date) && (
                            <div className="absolute inset-0 bg-blue-200/30 ring-1 ring-blue-300/40" />
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
