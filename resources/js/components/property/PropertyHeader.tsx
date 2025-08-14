import React from 'react';
import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Bed, Bath, Star, Heart, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PropertyWithDetails } from '@/types/property';

interface PropertyHeaderProps {
  property: PropertyWithDetails;
}

export const PropertyHeader: React.FC<PropertyHeaderProps> = ({ property }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/properties" className="hover:text-primary transition-colors font-medium">
          {t('properties.properties')}
        </Link>
        <span className="text-muted-foreground">›</span>
        <span className="text-foreground font-semibold">{property.name}</span>
      </div>
      
      {/* Header Content */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text">
              {property.name}
            </h1>
            {property.is_featured && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg">
                <Star className="h-3 w-3 mr-1" />
                {t('properties.featured')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg border border-border/50">
            <MapPin className="h-5 w-5 mr-3 text-primary" />
            <span className="font-medium">{property.address}</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{property.capacity}-{property.capacity_max} {t('booking.guests')}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Bed className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-foreground">{property.bedroom_count} {t('properties.bedrooms')}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Bath className="h-4 w-4 text-green-500" />
              <span className="font-semibold text-foreground">{property.bathroom_count} {t('properties.bathrooms')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200">
            <Heart className="h-4 w-4 mr-2 text-primary" />
            {t('properties.save')}
          </Button>
          <Button variant="outline" size="sm" className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200">
            <Share2 className="h-4 w-4 mr-2 text-primary" />
            {t('properties.share')}
          </Button>
        </div>
      </div>
    </div>
  );
};