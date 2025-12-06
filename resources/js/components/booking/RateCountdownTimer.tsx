import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface RateCountdownTimerProps {
    expiryMinutes?: number;
    onExpire?: () => void;
    className?: string;
}

export default function RateCountdownTimer({
    expiryMinutes = 15,
    onExpire,
    className = ''
}: RateCountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState(expiryMinutes * 60); // in seconds
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (timeLeft <= 0) {
            setIsExpired(true);
            if (onExpire) {
                onExpire();
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, onExpire]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const getColorClass = () => {
        if (timeLeft <= 60) return 'text-red-600 bg-red-50 border-red-200';
        if (timeLeft <= 300) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    if (isExpired) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border bg-red-50 border-red-200 ${className}`}>
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                    Rate expired - Please refresh
                </span>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border ${getColorClass()} ${className}`}>
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <div className="flex flex-col items-center leading-tight">
                <span className="text-[10px] opacity-75 leading-none">Promo berlaku hingga</span>
                <span className="text-sm font-bold font-mono leading-none mt-0.5">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
            </div>
        </div>
    );
}
