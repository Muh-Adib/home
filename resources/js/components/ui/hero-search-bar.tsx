import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Search, MapPin, Clock } from 'lucide-react';
import { Button } from './button';
import DateRange from './date-range';
import { format, addDays } from 'date-fns';
import { id } from 'date-fns/locale';

interface HeroSearchBarProps {
    onSearch: (params: {
        checkIn: string;
        checkOut: string;
        guests: number;
    }) => void;
    loading?: boolean;
    className?: string;
}

export default function HeroSearchBar({ 
    onSearch, 
    loading = false, 
    className = '' 
}: HeroSearchBarProps) {
    const [searchDates, setSearchDates] = useState(() => {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        return {
            checkIn: today.toISOString().split('T')[0],
            checkOut: tomorrow.toISOString().split('T')[0]
        };
    });
    const [guests, setGuests] = useState(2);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSearch = () => {
        onSearch({
            checkIn: searchDates.checkIn,
            checkOut: searchDates.checkOut,
            guests
        });
    };

    const formatDisplayDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return format(date, 'd MMM', { locale: id });
        } catch {
            return 'Pilih tanggal';
        }
    };

    const nights = Math.ceil(
        (new Date(searchDates.checkOut).getTime() - new Date(searchDates.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
        <motion.div 
            className={`bg-card rounded-2xl shadow-lg border border-border p-6 ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Date Range - Horizontal Layout */}
                <div className="md:col-span-2">
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Calendar className="h-4 w-4 text-primary" />
                            Tanggal Menginap
                        </label>
                        <div className="relative">
                            <DateRange
                                startDate={searchDates.checkIn}
                                endDate={searchDates.checkOut}
                                onDateChange={(start, end) => setSearchDates({ checkIn: start, checkOut: end })}
                                className="bg-card border-border hover:border-primary/50 focus:ring-primary"
                                size="lg"
                                compact={false}
                            />
                            
                        </div>
                    </div>
                </div>
                
                {/* Guests Selector */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        Jumlah Tamu
                    </label>
                    <div className="relative">
                        <select
                            value={guests}
                            onChange={(e) => setGuests(parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-card hover:bg-muted text-foreground appearance-none"
                        >
                            {[...Array(20)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {i + 1} {i === 0 ? 'Tamu' : 'Tamu'}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>
                
                {/* Search Button */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground opacity-0">
                        Cari
                    </label>
                    <Button 
                        onClick={handleSearch}
                        disabled={loading}
                        size="lg" 
                        className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Mencari...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                <span>Cari Homestay</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>

            {/* Quick Filters */}
            <motion.div 
                className="mt-4 pt-4 border-t border-border"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3, delay: 0.4 }}
            >
                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Populer:</span>
                    {[
                        { label: 'Dekat Malioboro', icon: MapPin },
                        { label: 'Area Keraton', icon: MapPin },
                        { label: 'Taman Sari', icon: MapPin },
                        { label: 'Check-in Hari Ini', icon: Clock }
                    ].map((filter, index) => (
                        <button
                            key={index}
                            className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-full transition-colors flex items-center gap-1"
                        >
                            <filter.icon className="h-3 w-3" />
                            {filter.label}
                        </button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
