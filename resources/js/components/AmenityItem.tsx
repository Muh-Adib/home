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
            <div className={cn("flex items-center gap-3 p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 hover:shadow-md transition-all duration-200", className)}>
                <IconComponent className={cn("h-5 w-5 text-primary", iconClassName)} />
                {showName && <span className="text-sm font-medium text-foreground">{amenity.name}</span>}
            </div>
        );
    }
    
    if (variant === 'card') {
        return (
            <div className={cn("flex items-center space-x-3 p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 hover:shadow-lg transition-all duration-200", className)}>
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <IconComponent className={cn("h-5 w-5 text-primary", iconClassName)} />
                </div>
                {showName && (
                    <div className="flex-1">
                        <div className="font-semibold text-foreground">{amenity.name}</div>
                        {amenity.description && (
                            <div className="text-sm text-muted-foreground mt-1">{amenity.description}</div>
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