import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BookingDateDisplayProps {
    checkIn: string;
    checkOut: string;
    checkInTime: string;
    checkOutTime: string;
    nights?: number;
    errors?: {
        check_in?: string;
        check_out?: string;
    };
}

export default function BookingDateDisplay({ 
    checkIn, 
    checkOut, 
    checkInTime, 
    checkOutTime, 
    nights, 
    errors 
}: BookingDateDisplayProps) {
    return (
        <div className="space-y-3">
            <Label className="text-base font-medium">Check-in & Check-out Dates</Label>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Check in</div>
                    <div className="font-semibold text-foreground text-sm">
                        <Input
                            type="text"
                            value={checkIn ? new Date(checkIn).toLocaleDateString('id-ID', { 
                                weekday: 'short', 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                            }) : ''}
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed text-center border-0 p-0 shadow-none focus:ring-0 focus:border-0 text-foreground"
                        />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {checkInTime}
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-8 h-0.5 bg-border"></div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {checkIn && checkOut ? `${nights || 0} malam` : ''}
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Check out</div>
                    <div className="font-semibold text-foreground text-sm">
                        <Input
                            type="text"
                            value={checkOut ? new Date(checkOut).toLocaleDateString('id-ID', { 
                                weekday: 'short', 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                            }) : ''}
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed text-center border-0 p-0 shadow-none focus:ring-0 focus:border-0 text-foreground"
                        />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {checkOutTime}
                    </div>
                </div>
            </div>
            {(errors?.check_in || errors?.check_out) && (
                <p className="text-sm text-red-600 mt-1">
                    {errors.check_in || errors.check_out}
                </p>
            )}
        </div>
    );
}
