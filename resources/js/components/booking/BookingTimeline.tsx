import React, { useState, useMemo, useRef, useEffect } from "react";

import { generateTimelineDates } from "@/utils/date";
import BookingTimelineHeader from "./BookingTimelineHeader";
import BookingTimelineRow from "./BookingTimelineRow";
import BookingDetailModal from "./BookingDetailModal";
import { Booking, Property, BookingStatus, PaymentStatus } from "@/types";
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
import axios from "axios";

interface BookingTimelineProps {
    properties: Property[];
    bookings: Booking[];
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
    bookings: initialBookings,
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

    // State
    // If autoFetch is true, we ignore initialBookings to avoid flashing incomplete data
    const [localBookings, setLocalBookings] = useState<Booking[]>(autoFetch ? [] : initialBookings);
    const [currentStartDate, setCurrentStartDate] = useState(startDate || new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [cellWidth, setCellWidth] = useState(initialWidth);
    const [rowHeight, setRowHeight] = useState(initialRowHeight);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);

    // Initial fetch for Index page or when autoFetch is true
    useEffect(() => {
        if (autoFetch) {
            const fetchInitialData = async () => {
                try {
                    const start = currentStartDate;
                    const end = new Date(currentStartDate);
                    end.setDate(end.getDate() + days);

                    const response = await axios.get('/api/admin/booking-management/timeline', {
                        params: {
                            start_date: start.toISOString().split('T')[0],
                            end_date: end.toISOString().split('T')[0],
                        }
                    });

                    if (response.data && response.data.bookings) {
                        const fetchedBookings = response.data.bookings as Booking[];
                        setLocalBookings(fetchedBookings);
                    }
                } catch (error) {
                    console.error("Failed to fetch initial timeline data", error);
                }
            };
            fetchInitialData();
        } else {
            setLocalBookings(initialBookings);
        }
    }, [autoFetch, initialBookings]);
    const [extraDays, setExtraDays] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Drag State
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Handle body overflow for fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // Dynamic Days Calculation
    useEffect(() => {
        const calculateMinDays = () => {
            if (scrollContainerRef.current) {
                const containerWidth = scrollContainerRef.current.clientWidth;
                // Subtract property column width (approx 260px)
                const availableWidth = containerWidth - 260;
                const neededDays = Math.ceil(availableWidth / cellWidth);
                if (neededDays > days + extraDays) {
                    setExtraDays(prev => Math.max(prev, neededDays - days + 5)); // Add buffer
                }
            }
        };

        // Run initially and on resize
        calculateMinDays();
        window.addEventListener('resize', calculateMinDays);
        return () => window.removeEventListener('resize', calculateMinDays);
    }, [cellWidth, days]);

    // Update local bookings when prop changes (e.g. manual refresh)
    useEffect(() => {
        setLocalBookings(initialBookings);
    }, [initialBookings]);

    const timelineDates = useMemo(
        () => generateTimelineDates(days + extraDays, currentStartDate),
        [days, extraDays, currentStartDate]
    );

    const bookingsByProperty = useMemo(() => {
        const grouped: Record<number, Booking[]> = {};
        properties.forEach((p) => {
            grouped[p.id] = localBookings.filter((b) => b.property_id === p.id);
        });
        return grouped;
    }, [properties, localBookings]);

    const timelineWidth = timelineDates.length * cellWidth;

    // Fullscreen Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            setControlsVisible(!isFull);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Fetch More Bookings
    const fetchMoreBookings = async (newExtraDays: number) => {
        if (isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            // Calculate new date range
            // Start from the end of CURRENT loaded range
            const currentEndDate = new Date(currentStartDate);
            currentEndDate.setDate(currentEndDate.getDate() + days + extraDays);

            // Fetch next batch (e.g. 14 days)
            const nextEndDate = new Date(currentEndDate);
            nextEndDate.setDate(nextEndDate.getDate() + 14);

            const response = await axios.get('/api/admin/booking-management/timeline', {
                params: {
                    start_date: currentEndDate.toISOString().split('T')[0],
                    end_date: nextEndDate.toISOString().split('T')[0],
                }
            });

            if (response.data && response.data.bookings) {
                // Backend now returns flat bookings array
                const newBookings = response.data.bookings as Booking[];

                setLocalBookings(prev => {
                    // Merge and deduplicate
                    const existingIds = new Set(prev.map(b => b.id));
                    const uniqueNew = newBookings.filter(b => !existingIds.has(b.id));
                    return [...prev, ...uniqueNew];
                });
            }
        } catch (error) {
            console.error("Failed to fetch more bookings", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Scroll to today on mount
    useEffect(() => {
        // Run only once on mount to set initial scroll position
        if (scrollContainerRef.current && timelineDates.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get start date from timeline (should match currentStartDate)
            const start = timelineDates[0];

            // Check if today is after start date
            if (today > start) {
                // Calculate difference in days
                const diffTime = today.getTime() - start.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                // Scroll to today position
                if (diffDays > 0) {
                    // We scroll exactly to today so it appears as the first column
                    const scrollPos = diffDays * cellWidth;
                    scrollContainerRef.current.scrollLeft = scrollPos;
                }
            }
        }
    }, []); // Empty dependency array prevents re-scrolling on updates

    // Initial fetch if required (e.g. when used in Index page with paginated data)
    /* 
       Note: We add a new prop `fetchInitialData` to control this.
       Ideally, we should add it to the component interface.
       For now, we can check if bookings prop is empty or suspicious, but explicit prop is better.
       Let's assume the user will simply update Index.tsx to pass empty bookings if they want a fetch.
       Or we can add a simple check: if bookings.length < someThreshold and we expect more?
       Better: Add a useEffect to fetch if localBookings is empty? No, that might be valid.
       
       Let's stick to fixing the API response handling first as requested.
       If the user wants the Index page to work better, they should likely modify Index.tsx to pass correct data
       OR we can add a fetch-on-mount behavior here.
    */

    /* For the Timeline on Index page issue: 
       The component receives paginated data (e.g. 15 items).
       A quick fix is to fetch the full range on mount if we detect we are in a 'limited' context?
       But we don't know the context.
       
       Let's just fix the API handling for now, as that's the explicit error "fetching seems wrong/not fitting".
    */

    // Infinite Scroll & Drag Handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 300) {
            const newExtra = extraDays + 7;
            setExtraDays(newExtra);
            fetchMoreBookings(newExtra);
        }
    };

    // Mouse Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        scrollContainerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (scrollContainerRef.current) scrollContainerRef.current.style.cursor = 'grab';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll-fast multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };


    const navigateTimeline = (dir: "prev" | "next") => {
        const newDate = new Date(currentStartDate);
        dir === "prev"
            ? newDate.setDate(newDate.getDate() - days)
            : newDate.setDate(newDate.getDate() + days);
        setCurrentStartDate(newDate);
        // setExtraDays(0); 
        if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
    };

    const goToToday = () => {
        setCurrentStartDate(new Date());
        setExtraDays(0);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
    };

    const toggleFullscreen = () => {
        const el = timelineRef.current;
        if (!document.fullscreenElement) {
            el?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const zoomOut = () => {
        setCellWidth((v) => Math.max(35, v - 10));
        setRowHeight((v) => Math.max(35, v - 10));
    };
    const zoomIn = () => {
        setCellWidth((v) => Math.min(200, v + 10));
        setRowHeight((v) => Math.min(200, v + 10));
    };
    const zoomReset = () => {
        setCellWidth(initialWidth);
        setRowHeight(initialRowHeight);
    };

    const formatDateRange = () => {
        const start = timelineDates[0];
        const end = timelineDates[timelineDates.length - 1];
        return `${start.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
        })} - ${end.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })}`;
    };

    return (
        <div
            className={`space-y-4 group ${isFullscreen ? 'bg-white h-screen overflow-hidden flex flex-col' : ''}`} // Full height in FS
            ref={timelineRef}
            // onMouseMove removed for performance, using CSS group-hover instead
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

                            <div className={`flex items-center flex-wrap justify-center gap-1 sm:gap-2 ${isFullscreen && !controlsVisible ? 'pointer-events-none' : ''}`}>
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
                        <div className="min-w-fit transition-all duration-100" style={{ width: timelineWidth + 260 }}>

                            {/* Sticky header */}
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

            {/* Helper function handled via useEffect now */}
        </div>
    );
}
