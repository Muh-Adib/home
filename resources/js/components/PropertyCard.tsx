import React from 'react';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Building2,
    MapPin,
    Users,
    Bed,
    Bath,
    Star,
    Heart,
    Sparkles,
    type LucideIcon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import AmenityItem from '@/components/AmenityItem';
import { Amenity, PropertyMedia } from '@/types';
import { Property } from '@/types/property';



// Main PropertyCard props interface extending React.ComponentPropsWithoutRef for full reusability
interface PropertyCardProps {
    property: Property;
    viewMode?: 'grid' | 'list';
    buildPropertyUrl?: (property: Property) => string;
    showFullDescription?: boolean;
    maxAmenities?: number;
    hidePrice?: boolean;
    hideFeatures?: boolean;
    customButton?: React.ReactNode;
    className?: string;
    classNames?: {
        card?: string;
        image?: string;
        content?: string;
        title?: string;
        description?: string;
        features?: string;
        amenities?: string;
        price?: string;
        button?: string;
    };
}

/**
 * PropertyCard - Fully reusable component for displaying property information
 * 
 * Features:
 * - Grid and List view modes
 * - Customizable through className and classNames props
 * - Support for seasonal rates and featured properties
 * - Responsive design with modern UI
 * - Full TypeScript support
 * - Accessible design with proper alt texts
 */
export default function PropertyCard({ 
    property, 
    viewMode = 'grid',
    buildPropertyUrl,
    showFullDescription = false,
    maxAmenities = 5,
    hidePrice = false,
    hideFeatures = false,
    customButton,
    className,
    classNames,
    ...rest 
}: PropertyCardProps) {
    const { t } = useTranslation();
    
    // Get featured image with fallback
    const featuredImage = property.media?.[0];
    
    // Default URL builder if none provided
    const getPropertyUrl = (prop: Property) => {
        if (buildPropertyUrl) {
            return buildPropertyUrl(prop);
        }
        return `/properties/${prop.slug}`;
    };
    
    // Common image component
    const PropertyImage = () => (
        <div className={cn(
            "bg-slate-200 relative overflow-hidden",
            viewMode === 'list' 
                ? "md:w-80 aspect-video md:aspect-square" 
                : "aspect-video",
            classNames?.image
        )}>
            {featuredImage ? (
                <img 
                    src={featuredImage.url} 
                    alt={featuredImage.alt_text || property.name}
                    className={cn(
                        "w-full h-full object-cover",
                        viewMode === 'grid' && "group-hover:scale-105 transition-transform duration-300"
                    )}
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-blue-400" />
                </div>
            )}
            
            {/* Featured Badge */}
            {property.is_featured && (
                <Badge className="absolute top-3 left-3 bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    {t('properties.featured')}
                </Badge>
            )}
            
            {/* Seasonal Rate Badge */}
            {property.has_seasonal_rate && (
                <Badge className="absolute top-3 right-3 bg-green-500 text-white">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('properties.special_offer')}
                </Badge>
            )}
            
            {/* Heart Button for Grid View */}
            {viewMode === 'grid' && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-3 right-3 bg-white/80 hover:bg-white shadow-lg"
                >
                    <Heart className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
    
    // Property features component
    const PropertyFeatures = ({ detailed = false }) => (
        !hideFeatures && (
            <div className={cn(
                "flex items-center gap-3 text-sm text-gray-600",
                viewMode === 'list' ? "gap-4 mb-4" : "",
                classNames?.features
            )}>
                <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1" />
                    {property.bedroom_count}{detailed && ` ${t('properties.bedrooms')}`}
                </div>
                <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-1" />
                    {property.bathroom_count}{detailed && ` ${t('properties.bathrooms')}`}
                </div>
                <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {property.capacity}-{property.capacity_max}{detailed && ` ${t('booking.guests')}`}
                </div>
            </div>
        )
    );
    
    // Amenities preview component - Updated to use AmenityItem
    const AmenitiesPreview = ({ showNames = false }) => (
        property.amenities && property.amenities.length > 0 && (
            <div className={cn(
                "flex flex-wrap gap-1",
                viewMode === 'list' ? "mb-4" : "",
                classNames?.amenities
            )}>
                {property.amenities.slice(0, maxAmenities).map((amenity: Amenity, index: number) => (
                    <AmenityItem 
                        key={`amenity-${amenity.id || amenity.name}-${index}`}
                        amenity={amenity}
                        variant="badge"
                        showName={showNames}
                    />
                ))}
                {property.amenities.length > maxAmenities && (
                    <Badge 
                        key={`more-amenities-${property.id}`}
                        variant="outline" 
                        className="text-xs bg-gray-50"
                    >
                        +{property.amenities.length - maxAmenities} {t('common.more')}
                    </Badge>
                )}
            </div>
        )
    );
    
    // Price display component
    const PriceDisplay = ({ size = 'base' }) => (
        !hidePrice && (
            <div className={cn(classNames?.price)}>
                <div className="flex items-baseline">
                    <span className={cn(
                        "font-bold text-blue-600",
                        size === 'large' ? "text-2xl" : "text-xl"
                    )}>
                        {property.formatted_current_rate || property.formatted_base_rate}
                    </span>
                    <span className="text-gray-600 text-sm ml-1">/{t('common.per_night')}</span>
                </div>
                
                {property.has_seasonal_rate && property.seasonal_rate_info && (
                    <div className="text-xs text-green-600 mt-1 flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {property.seasonal_rate_info[0]?.name || t('properties.special_rates_available')}
                    </div>
                )}
            </div>
        )
    );
    
    // Action button component
    const ActionButton = () => {
        if (customButton) {
            return <>{customButton}</>;
        }
        
        // For grid view, we don't need Link since the entire card is clickable
        if (viewMode === 'grid') {
            return (
                <Button 
                    size={viewMode === 'grid' ? "sm" : "default"} 
                    className={cn(
                        "bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-700",
                        classNames?.button
                    )}
                >
                    {viewMode === 'grid' ? t('properties.view') : t('properties.view_details')}
                </Button>
            );
        }
        // For list view, we need the Link since the card is not clickable
        return (
            <Link href={getPropertyUrl(property)}>
                <Button 
                    size={viewMode === 'list' ? "default" : "sm"} 
                    className={cn(
                        "bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-700",
                        classNames?.button
                    )}
                >
                    {viewMode === 'list' ? t('properties.view_details') : t('properties.view')}
                </Button>
            </Link>
        );
    };
    
    // List View Layout
    if (viewMode === 'list') {
        return (
            <Card className={cn(
                "overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md pt-0",
                classNames?.card,
                className
            )} {...rest}>
                <div className="flex flex-col md:flex-row">
                    <PropertyImage />
                    
                    <div className={cn("flex-1 p-6", classNames?.content)}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className={cn(
                                    "text-xl font-bold text-gray-900 mb-2 line-clamp-1",
                                    classNames?.title
                                )}>
                                    {property.name}
                                </h3>
                                <div className="flex items-center text-gray-600 mb-3">
                                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                    <span className="line-clamp-1 text-sm">{property.address}</span>
                                </div>
                            </div>
                            
                            <Button variant="ghost" size="sm" className="flex-shrink-0 ml-2">
                                <Heart className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <p className={cn(
                            "text-gray-600 text-sm mb-4",
                            showFullDescription ? "" : "line-clamp-2",
                            classNames?.description
                        )}>
                            {property.description}
                        </p>
                        
                        <PropertyFeatures detailed={true} />
                        <AmenitiesPreview showNames={true} />
                        
                        <div className="flex items-center justify-between">
                            <PriceDisplay size="large" />
                            <ActionButton />
                        </div>
                    </div>
                </div>
            </Card>
        );
    }
    
    // Grid View Layout (default)
    return (
        <Link href={getPropertyUrl(property)}>
        <Card className={cn(
            "overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 shadow-md",
            classNames?.card,
            className
        )} {...rest}>
            <PropertyImage />
            
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className={cn(
                        "text-lg line-clamp-1 flex-1",
                        classNames?.title
                    )}>
                        {property.name}
                    </CardTitle>
                </div>
                <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1 text-sm">{property.address}</span>
                </div>
            </CardHeader>
            
            <CardContent className={cn("space-y-4", classNames?.content)}>
                <p className={cn(
                    "text-gray-600 text-sm",
                    showFullDescription ? "" : "line-clamp-2",
                    classNames?.description
                )}>
                    {property.description}
                </p>
                
                <PropertyFeatures />
                <AmenitiesPreview />
                
                <div className="flex flex-col gap-2 pt-2 items-center">
                    <div className="w-full">
                        <PriceDisplay />
                    </div>
                    <div className="w-full">
                        <ActionButton />
                    </div>
                </div>
            </CardContent>
        </Card>
        </Link>
    );
}

// Export types for external use
export type { PropertyCardProps, Property, PropertyMedia, Amenity }; 