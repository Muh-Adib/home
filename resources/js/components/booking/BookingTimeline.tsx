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
import { requestCache } from "@/utils/requestCache";

interface BookingTimelineProps {
    properties: Property[];
    bookings?: Booking[]; // Optional when autoFetch=true
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
    bookings: initialBookings = [], // Default to empty array
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

    // State - ALL declarations BEFORE useEffect
    const [localBookings, setLocalBookings] = useState<Booking[]>([]);
    const [currentStartDate, setCurrentStartDate] = useState(startDate || new Date());
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [cellWidth, setCellWidth] = useState(initialWidth);
    const [rowHeight, setRowHeight] = useState(initialRowHeight);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [extraDays, setExtraDays] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [prependDays, setPrependDays] = useState(0);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Ref to track mount and prevent double-fetch
    const hasFetchedRef = useRef(false);

    // Initial data setup - ONCE on mount only
    useEffect(() => {
        // Handle non-autoFetch mode - use provided bookings
        if (!autoFetch) {
            console.log('[Timeline] Using provided bookings:', initialBookings.length);
            setLocalBookings(initialBookings);
            return;
        }

        // AutoFetch mode - fetch from API (once only)
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true; // Prevent double-fetch

            const fetchInitialData = async () => {
                console.log('[Timeline] Starting initial fetch...');
                setIsInitialLoading(true);
                setFetchError(null);

                try {
                    const start = new Date(currentStartDate);
                    const end = new Date(currentStartDate);
                    end.setDate(end.getDate() + days);

                    const params = {
                        date_from: start.toISOString().split('T')[0],
                        date_to: end.toISOString().split('T')[0],
                    };

                    console.log('[Timeline] Fetch params:', params);

                    // Use request cache for deduplication + retry
                    const response = await requestCache.fetch<{ success: boolean; bookings: Booking[] }>(
                        '/api/admin/booking-management/timeline-data',
                        {
                            params,
                            ttl: 2 * 60 * 1000, // 2 min cache
                            maxRetries: 3,
                        }
                    );

                    console.log('[Timeline] Response:', {
                        success: response.success,
                        count: response.bookings?.length || 0
                    });

                    if (response.bookings) {
                        setLocalBookings(response.bookings);
                        console.log('[Timeline] ✅ Data loaded:', response.bookings.length, 'bookings');
                    } else {
                        console.warn('[Timeline] ⚠️ No bookings in response');
                        setLocalBookings([]);
                    }
                } catch (error: any) {
                    console.error('[Timeline] ❌ Fetch failed:', error);
                    setFetchError(error.message || 'Failed to load');
                    setLocalBookings([]);
                } finally {
                    setIsInitialLoading(false);
                }
            };

            fetchInitialData();
        }
    }, []); // Empty deps - run ONCE on mount!

    // Ref to prevent rapid re-triggering
    const lastBackwardFetchRef = useRef<number>(0);
    const lastForwardFetchRef = useRef<number>(0);

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

    // Dynamic Days Calculation - FIXED: Removed extraDays dependency to prevent infinite loop
    useEffect(() => {
        const calculateMinDays = () => {
            if (scrollContainerRef.current) {
                const containerWidth = scrollContainerRef.current.clientWidth;
                const availableWidth = containerWidth - 260; // Subtract property column
                const neededDays = Math.ceil(availableWidth / cellWidth);

                // Only update if needed (with guard to prevent loop)
                setExtraDays(prev => {
                    const currentTotal = days + prev;
                    if (neededDays > currentTotal) {
                        const newExtra = neededDays - days + 5; // Buffer
                        return newExtra > prev ? newExtra : prev;
                    }
                    return prev; // No change
                });
            }
        };

        calculateMinDays();
        window.addEventListener('resize', calculateMinDays);
        return () => window.removeEventListener('resize', calculateMinDays);
    }, [cellWidth, days]); // Removed extraDays - it was causing infinite loop!

    // REMOVED: This useEffect was causing infinite loop with autoFetch mode
    // When autoFetch=true, initialBookings is always [], so no point updating
    // useEffect(() => {
    //     setLocalBookings(initialBookings);
    // }, [initialBookings]);

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

            // Use optimized timeline-data endpoint
            const response = await axios.get('/api/admin/booking-management/timeline-data', {
                params: {
                    date_from: currentEndDate.toISOString().split('T')[0],
                    date_to: nextEndDate.toISOString().split('T')[0],
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

    // Fetch Previous Bookings (backward scroll)
    const fetchPreviousBookings = async () => {
        if (isLoadingMore) return;

        setIsLoadingMore(true);

        // Save current scroll position
        const currentScrollLeft = scrollContainerRef.current?.scrollLeft || 0;

        try {
            // Calculate previous date range
            const previousStartDate = new Date(currentStartDate);
            previousStartDate.setDate(previousStartDate.getDate() - prependDays - 14); // Go back 14 days

            const previousEndDate = new Date(currentStartDate);
            previousEndDate.setDate(previousEndDate.getDate() - prependDays);

            // Use optimized timeline-data endpoint
            const response = await axios.get('/api/admin/booking-management/timeline-data', {
                params: {
                    date_from: previousStartDate.toISOString().split('T')[0],
                    date_to: previousEndDate.toISOString().split('T')[0],
                }
            });

            if (response.data && response.data.bookings) {
                const newBookings = response.data.bookings as Booking[];

                setLocalBookings(prev => {
                    // Merge and deduplicate
                    const existingIds = new Set(prev.map(b => b.id));
                    const uniqueNew = newBookings.filter(b => !existingIds.has(b.id));
                    return [...uniqueNew, ...prev]; // Prepend to beginning
                });

                // Update prepend days and adjust start date
                setPrependDays(prev => prev + 14);
                const newStartDate = new Date(currentStartDate);
                newStartDate.setDate(newStartDate.getDate() - 14);
                setCurrentStartDate(newStartDate);

                // Restore scroll position after data loads (add offset for new content)
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        // Add width of 14 new days to maintain visual position
                        scrollContainerRef.current.scrollLeft = currentScrollLeft + (14 * cellWidth);
                    }
                }, 50);
            }
        } catch (error) {
            console.error("Failed to fetch previous bookings", error);
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

    // Infinite Scroll & Drag Handler (bidirectional)
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;

        // Scroll to right (forward) - load more future dates
        if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 300) {
            const newExtra = extraDays + 7;
            setExtraDays(newExtra);
            fetchMoreBookings(newExtra);
        }

        // Scroll to left (backward) - load more past dates
        // Debounce: only trigger if 2 seconds passed since last fetch
        const now = Date.now();
        if (target.scrollLeft <= 300 && prependDays < 365 && !isLoadingMore) {
            if (now - lastBackwardFetchRef.current > 2000) {
                lastBackwardFetchRef.current = now;
                fetchPreviousBookings();
            }
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
                        {isInitialLoading ? (
                            // Skeleton Loader
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

            {/* Helper function handled via useEffect now */}
        </div>
    );
}
