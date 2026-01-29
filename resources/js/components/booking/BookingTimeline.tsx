import React, { useState, useRef } from "react";
import BookingTimelineHeader from "./BookingTimelineHeader";
import BookingTimelineRow from "./BookingTimelineRow";
import BookingDetailModal from "./BookingDetailModal";
import { Booking, Property } from "@/types";
import { Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Plus,
    RefreshCw,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    Search,
} from "lucide-react";
import { useBookingTimeline } from "@/hooks/useBookingTimeline";

interface BookingTimelineProps {
    properties: Property[];
    bookings?: Booking[];
    startDate?: Date;
    days?: number;
    cellWidth?: number;
    rowHeight?: number;
    canVerify?: boolean;
    canCancel?: boolean;
    canCheckIn?: boolean;
    onRefresh?: () => void;
    autoFetch?: boolean;
}

export default function BookingTimeline({
    properties,
    bookings: initialBookings = [],
    startDate,
    days = 30,
    cellWidth: initialWidth = 120,
    rowHeight: initialRowHeight = 60,
    canVerify = false,
    canCancel = false,
    canCheckIn = false,
    onRefresh,
    autoFetch = false,
}: BookingTimelineProps) {
    const timelineRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    const {
        localBookings,
        timelineDates,
        bookingsByProperty,
        cellWidth,
        rowHeight,
        isFullscreen,
        controlsVisible,
        isInitialLoading,
        isLoadingMore,
        timelineWidth,
        setControlsVisible,
        // actions
        navigateTimeline,
        goToToday,
        toggleFullscreen,
        zoomIn,
        zoomOut,
        zoomReset,
        handleScroll,
        handleMouseDown,
        handleMouseLeave,
        handleMouseUp,
        handleMouseMove,
        formatDateRange
    } = useBookingTimeline({
        properties,
        initialBookings,
        startDate,
        days,
        initialCellWidth: initialWidth,
        initialRowHeight,
        autoFetch,
        scrollContainerRef,
        timelineRef
    });

    return (
        <div
            className={`space-y-4 group ${isFullscreen ? 'bg-white h-screen overflow-hidden flex flex-col' : ''}`}
            ref={timelineRef}
            onMouseLeave={() => isFullscreen && setControlsVisible(false)}
        >
            {/* Header */}
            <div className={`transition-all duration-300 ease-in-out z-50 ${isFullscreen ? (controlsVisible ? 'opacity-100 translate-y-0 absolute w-full top-0' : 'opacity-0 -translate-y-full absolute w-full top-0 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto') : ''}`}>
                <Card className={`border-none shadow-md rounded-2xl bg-white/95 backdrop-blur ${isFullscreen ? 'rounded-none' : ''}`}>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Booking Timeline
                                </CardTitle>
                                <div className="text-xs sm:text-sm text-gray-600 font-medium">
                                    {formatDateRange()}
                                </div>
                                {isLoadingMore && <div className="text-xs text-blue-500 animate-pulse">Loading more...</div>}
                            </div>

                            <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-2">
                                <Button variant="outline" size="icon" onClick={() => navigateTimeline("prev")}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button size="sm" className="hidden sm:block bg-blue-600 text-white" onClick={goToToday}>
                                    Today
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => navigateTimeline("next")}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button size="icon" className="sm:hidden bg-blue-600 text-white" onClick={goToToday}>
                                    <Calendar className="h-4 w-4" />
                                </Button>
                                {onRefresh && (
                                    <Button variant="outline" size="icon" onClick={onRefresh}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="outline" size="icon" onClick={zoomOut}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={zoomReset}>
                                    <Search className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={zoomIn}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={toggleFullscreen}>
                                    {!isFullscreen ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                                </Button>
                                <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
                                    <Link href="/admin/bookings/create">
                                        <Plus className="h-4 w-4 mr-2" /> New
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Timeline Area */}
            <Card className={`rounded-2xl shadow-md border-none overflow-hidden bg-white ${isFullscreen ? 'h-full rounded-none flex-1 mt-0' : ''}`}>
                <CardContent className={`p-0 ${isFullscreen ? 'h-full' : ''}`}>
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        className={`overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500 transition-colors cursor-grab ${isFullscreen ? 'h-full' : 'max-h-[75vh]'}`}
                    >
                        {isInitialLoading ? (
                            <div className="space-y-4 p-4 animate-pulse">
                                <div className="flex gap-2">
                                    <div className="w-[260px] h-16 bg-gray-200 rounded"></div>
                                    <div className="flex-1 flex gap-2">
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className="w-24 h-16 bg-gray-200 rounded"></div>
                                        ))}
                                    </div>
                                </div>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex gap-2">
                                        <div className="w-[260px] h-20 bg-gray-100 rounded"></div>
                                        <div className="flex-1 flex gap-2">
                                            {[...Array(10)].map((_, j) => (
                                                <div key={j} className="w-24 h-20 bg-gray-100 rounded"></div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="min-w-fit transition-all duration-100" style={{ width: timelineWidth + 260 }}>
                                <div className={`sticky ${isFullscreen ? (controlsVisible ? 'top-[80px]' : 'top-0') : 'top-0'} z-30 bg-white shadow-sm transition-all duration-300`}>
                                    <BookingTimelineHeader dates={timelineDates} cellWidth={cellWidth} />
                                </div>
                                <div className="relative divide-y select-none">
                                    {properties.map((property) => (
                                        <BookingTimelineRow
                                            key={property.id}
                                            property={property}
                                            bookings={bookingsByProperty[property.id] || []}
                                            timelineDates={timelineDates}
                                            cellWidth={cellWidth}
                                            rowHeight={rowHeight}
                                            onBookingClick={setSelectedBooking}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className={isFullscreen ? "fixed z-[100] top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center p-4" : ""}>
                <div className="pointer-events-auto">
                    <BookingDetailModal
                        booking={selectedBooking}
                        isOpen={!!selectedBooking}
                        onClose={() => setSelectedBooking(null)}
                        canVerify={canVerify}
                        canCancel={canCancel}
                        canCheckIn={canCheckIn}
                    />
                </div>
            </div>
        </div>
    );
}
