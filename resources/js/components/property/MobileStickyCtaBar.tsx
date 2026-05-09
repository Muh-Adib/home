import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatCurrency';
import type { Property } from '@/types/property';

interface MobileStickyCtaBarProps {
    property: Property;
    checkInDate?: string;
    checkOutDate?: string;
    guestCount?: number;
    sidebarRef: React.RefObject<HTMLDivElement | null>;
    onBookNow: () => void;
}

const buildWhatsAppMessage = (
    propertyName: string,
    checkIn?: string,
    checkOut?: string,
    guests?: number,
): string => {
    if (checkIn && checkOut && guests) {
        return encodeURIComponent(
            `Halo, saya tertarik dengan *${propertyName}*.\n` +
                `Check-in: ${checkIn}\nCheck-out: ${checkOut}\nTamu: ${guests} orang.\n` +
                `Apakah masih tersedia?`,
        );
    }
    return encodeURIComponent(
        `Halo, saya tertarik dengan *${propertyName}*. Boleh info ketersediaan dan harga?`,
    );
};

export default function MobileStickyCtaBar({
    property,
    checkInDate,
    checkOutDate,
    guestCount,
    sidebarRef,
    onBookNow,
}: MobileStickyCtaBarProps) {
    const [sidebarVisible, setSidebarVisible] = useState(false);

    useEffect(() => {
        const sidebar = sidebarRef.current;
        if (!sidebar) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setSidebarVisible(entry.isIntersecting);
            },
            { threshold: 0.1 },
        );

        observer.observe(sidebar);
        return () => observer.disconnect();
    }, [sidebarRef]);

    const waUrl = `https://wa.me/628112500082?text=${buildWhatsAppMessage(
        property.name,
        checkInDate,
        checkOutDate,
        guestCount,
    )}`;

    const currentRate = property.current_rate_per_night ?? property.base_rate;

    return (
        <AnimatePresence>
            {!sidebarVisible && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-lg"
                >
                    <div className="flex items-center justify-between px-4 py-3 pb-[env(safe-area-inset-bottom)]">
                        {/* Price */}
                        <div>
                            <span className="text-xs text-muted-foreground">Mulai dari</span>
                            <div className="text-lg font-bold text-brand-primary">
                                {formatCurrency(currentRate)}
                                <span className="text-xs font-normal text-muted-foreground">/malam</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                            >
                                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4" />
                                </a>
                            </Button>
                            <Button
                                size="sm"
                                className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md"
                                onClick={onBookNow}
                            >
                                Book Now
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
