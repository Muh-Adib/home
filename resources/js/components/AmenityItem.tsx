import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/lucide-icons';
import { type Amenity } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AmenityItemProps {
    amenity: Amenity;
    variant?: 'badge' | 'list' | 'card';
    showName?: boolean;
    className?: string;
    iconClassName?: string;
}

/**
 * Reusable component untuk menampilkan amenity dengan icon yang konsisten
 * 
 * @param amenity - Amenity object dari backend
 * @param variant - Tampilan: 'badge' (default), 'list', atau 'card'
 * @param showName - Apakah menampilkan nama amenity (default: true untuk list/card, false untuk badge)
 * @param className - Custom className untuk container
 * @param iconClassName - Custom className untuk icon
 */
export default function AmenityItem({ 
    amenity, 
    variant = 'badge', 
    showName = variant !== 'badge',
    className,
    iconClassName 
}: AmenityItemProps) {
    const IconComponent = getIconByName(amenity.icon);
    
    if (variant === 'badge') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className={cn("text-xs", className)}>
                            <IconComponent className={cn("h-4 w-4", showName && "mr-1", iconClassName)} />
                            {showName && <span>{amenity.name}</span>}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{amenity.name}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    if (variant === 'list') {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <IconComponent className={cn("h-4 w-4 text-gray-600", iconClassName)} />
                {showName && <span className="text-sm">{amenity.name}</span>}
            </div>
        );
    }
    
    if (variant === 'card') {
        return (
            <div className={cn("flex items-center space-x-3 p-3 bg-gray-50 rounded-lg", className)}>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <IconComponent className={cn("h-4 w-4 text-blue-600", iconClassName)} />
                </div>
                {showName && (
                    <div className="flex-1">
                        <div className="font-medium text-gray-900">{amenity.name}</div>
                        {amenity.description && (
                            <div className="text-sm text-gray-500 mt-1">{amenity.description}</div>
                        )}
                    </div>
                )}
            </div>
        );
    }
    
    return null;
}

// Export untuk kemudahan penggunaan
export { AmenityItem }; 