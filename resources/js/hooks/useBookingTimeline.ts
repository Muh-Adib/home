import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/api";
import { requestCache } from "@/utils/requestCache";
import { generateTimelineDates } from "@/utils/date";
import { Booking, Property } from "@/types";

interface UseBookingTimelineProps {
    properties: Property[];
    initialBookings: Booking[];
    startDate?: Date;
    days: number;
    initialCellWidth: number;
    initialRowHeight: number;
    autoFetch: boolean;
    scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
    timelineRef: React.MutableRefObject<HTMLDivElement | null>;
}

export function useBookingTimeline({
    properties,
    initialBookings,
    startDate,
    days,
    initialCellWidth,
    initialRowHeight,
    autoFetch,
    scrollContainerRef,
    timelineRef
}: UseBookingTimelineProps) {
    const [localBookings, setLocalBookings] = useState<Booking[]>([]);
    const [currentStartDate, setCurrentStartDate] = useState(startDate || new Date());
    const [cellWidth, setCellWidth] = useState(initialCellWidth);
    const [rowHeight, setRowHeight] = useState(initialRowHeight);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [extraDays, setExtraDays] = useState(0);
    const [prependDays, setPrependDays] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Refs for fetch control and drag
    const hasFetchedRef = useRef(false);
    const lastBackwardFetchRef = useRef<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // 1. Initial Fetch
    useEffect(() => {
        if (!autoFetch) {
            setLocalBookings(initialBookings);
            return;
        }

        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            const fetchInitialData = async () => {
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

                    const response = await requestCache.fetch<{ success: boolean; bookings: Booking[] }>(
                        '/api/admin/booking-management/timeline-data',
                        { params, ttl: 2 * 60 * 1000, maxRetries: 3 }
                    );

                    if (response.bookings) {
                        setLocalBookings(response.bookings);
                    }
                } catch (error: any) {
                    setFetchError(error.message || 'Failed to load');
                    setLocalBookings([]);
                } finally {
                    setIsInitialLoading(false);
                }
            };
            fetchInitialData();
        }
    }, [autoFetch, initialBookings, currentStartDate, days]);

    // 2. Fullscreen Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullscreen(isFull);
            setControlsVisible(!isFull);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isFullscreen]);

    // 3. Resize Listener (Extra Days)
    useEffect(() => {
        const calculateMinDays = () => {
            if (scrollContainerRef.current) {
                const containerWidth = scrollContainerRef.current.clientWidth;
                const availableWidth = containerWidth - 260;
                const neededDays = Math.ceil(availableWidth / cellWidth);

                setExtraDays(prev => {
                    const currentTotal = days + prev;
                    if (neededDays > currentTotal) {
                        const newExtra = neededDays - days + 5;
                        return newExtra > prev ? newExtra : prev;
                    }
                    return prev;
                });
            }
        };

        calculateMinDays();
        window.addEventListener('resize', calculateMinDays);
        return () => window.removeEventListener('resize', calculateMinDays);
    }, [cellWidth, days, scrollContainerRef]);

    // 4. Memoized Data
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

    // 5. Scroll & Data Fetching Actions
    const fetchMoreBookingsForward = useCallback(async () => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const currentEndDate = new Date(currentStartDate);
            currentEndDate.setDate(currentEndDate.getDate() + days + extraDays);
            const nextEndDate = new Date(currentEndDate);
            nextEndDate.setDate(nextEndDate.getDate() + 14);

            const responseData = await apiGet<{ success: boolean; bookings: Booking[] }>(
                '/api/admin/booking-management/timeline-data',
                {
                    date_from: currentEndDate.toISOString().split('T')[0],
                    date_to: nextEndDate.toISOString().split('T')[0],
                }
            );

            if (responseData?.bookings) {
                setLocalBookings(prev => {
                    const existingIds = new Set(prev.map(b => b.id));
                    const uniqueNew = (responseData.bookings as Booking[]).filter(b => !existingIds.has(b.id));
                    return [...prev, ...uniqueNew];
                });
            }
        } catch (error) {
            console.error("Failed to fetch more bookings", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, currentStartDate, days, extraDays]);

    const fetchMoreBookingsBackward = useCallback(async () => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        const currentScrollLeft = scrollContainerRef.current?.scrollLeft || 0;

        try {
            const previousStartDate = new Date(currentStartDate);
            previousStartDate.setDate(previousStartDate.getDate() - prependDays - 14);
            const previousEndDate = new Date(currentStartDate);
            previousEndDate.setDate(previousEndDate.getDate() - prependDays);

            const responseData = await apiGet<{ success: boolean; bookings: Booking[] }>(
                '/api/admin/booking-management/timeline-data',
                {
                    date_from: previousStartDate.toISOString().split('T')[0],
                    date_to: previousEndDate.toISOString().split('T')[0],
                }
            );

            if (responseData?.bookings) {
                const newBookings = responseData.bookings as Booking[];
                setLocalBookings(prev => {
                    const existingIds = new Set(prev.map(b => b.id));
                    const uniqueNew = newBookings.filter(b => !existingIds.has(b.id));
                    return [...uniqueNew, ...prev];
                });

                setPrependDays(prev => prev + 14);
                const newStartDate = new Date(currentStartDate);
                newStartDate.setDate(newStartDate.getDate() - 14);
                setCurrentStartDate(newStartDate);

                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollLeft = currentScrollLeft + (14 * cellWidth);
                    }
                }, 50);
            }
        } catch (error) {
            console.error("Failed to fetch previous bookings", error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, currentStartDate, prependDays, cellWidth, scrollContainerRef]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 300) {
            const newExtra = extraDays + 7;
            setExtraDays(newExtra);
            fetchMoreBookingsForward();
        }

        const now = Date.now();
        if (target.scrollLeft <= 300 && prependDays < 365 && !isLoadingMore) {
            if (now - lastBackwardFetchRef.current > 2000) {
                lastBackwardFetchRef.current = now;
                fetchMoreBookingsBackward();
            }
        }
    };

    // 6. Navigation Actions
    const navigateTimeline = (dir: "prev" | "next") => {
        const newDate = new Date(currentStartDate);
        dir === "prev"
            ? newDate.setDate(newDate.getDate() - days)
            : newDate.setDate(newDate.getDate() + days);
        setCurrentStartDate(newDate);
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
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // 7. Zoom Actions
    const zoomOut = () => {
        setCellWidth((v) => Math.max(35, v - 10));
        setRowHeight((v) => Math.max(35, v - 10));
    };
    const zoomIn = () => {
        setCellWidth((v) => Math.min(200, v + 10));
        setRowHeight((v) => Math.min(200, v + 10));
    };
    const zoomReset = () => {
        setCellWidth(initialCellWidth);
        setRowHeight(initialRowHeight);
    };

    // 8. Drag Handlers
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
        const walk = (x - startX) * 1.5;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const formatDateRange = () => {
        if (timelineDates.length === 0) return "";
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

    // Initial Scroll to Today
    useEffect(() => {
        if (scrollContainerRef.current && timelineDates.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = timelineDates[0];
            if (today > start) {
                const diffTime = today.getTime() - start.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    scrollContainerRef.current.scrollLeft = diffDays * cellWidth;
                }
            }
        }
    }, []); // Run once on hook mount

    return {
        localBookings,
        currentStartDate,
        timelineDates,
        bookingsByProperty,
        cellWidth,
        rowHeight,
        isFullscreen,
        controlsVisible,
        isInitialLoading,
        isLoadingMore,
        fetchError,
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
    };
}
