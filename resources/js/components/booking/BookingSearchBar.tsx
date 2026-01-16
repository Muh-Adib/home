import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Loader2 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { type Booking } from '@/types';
import axios from 'axios';

interface BookingSearchBarProps {
    placeholder?: string;
    className?: string;
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export default function BookingSearchBar({
    placeholder = 'Search bookings by code, guest name, or phone...',
    className = ''
}: BookingSearchBarProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Booking[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Debounced API search function
    const searchBookings = useMemo(
        () => debounce(async (searchQuery: string) => {
            if (searchQuery.length < 2) {
                setResults([]);
                setShowDropdown(false);
                return;
            }

            setIsSearching(true);
            try {
                const { data } = await axios.get('/api/admin/booking-management/search', {
                    params: { q: searchQuery }
                });
                setResults(data.bookings || []);
                setShowDropdown(true);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        []
    );

    // Auto-search on query change
    useEffect(() => {
        searchBookings(query);
    }, [query, searchBookings]);

    // Handle clear
    const handleClear = () => {
        setQuery('');
        setResults([]);
        setShowDropdown(false);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Format date
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    className="pl-10 pr-10"
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="h-4 w-4 text-gray-400" />
                    </button>
                )}
                {isSearching && (
                    <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-600 animate-spin" />
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && query.length >= 2 && (
                <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {results.length > 0 ? (
                        <>
                            {results.map((booking) => (
                                <Link
                                    key={booking.id}
                                    href={`/admin/bookings/${booking.booking_number}`}
                                    className="block px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">
                                                {booking.booking_number}
                                            </div>
                                            <div className="text-sm text-gray-600 truncate">
                                                {booking.guest_name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(booking.total_amount)}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${booking.booking_status === 'confirmed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : booking.booking_status === 'pending_verification'
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {booking.booking_status}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </>
                    ) : !isSearching && (
                        <div className="px-4 py-8 text-center text-gray-500">
                            <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No bookings found for "{query}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Click outside to close */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    );
}
