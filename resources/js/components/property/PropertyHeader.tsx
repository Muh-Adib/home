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
        <Link href="/properties" className="hover:text-brand-primary transition-colors font-medium">
          {t('properties.properties')}
        </Link>
        <span className="text-muted-foreground">›</span>
        <span className="text-brand-primary font-semibold">{property.name}</span>
      </div>
      
      {/* Header Content */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground bg-gradient-to-r from-brand-primary to-brand-primary/80 bg-clip-text text-brand-primary">
              {property.name}
            </h1>
            {property.is_featured && (
              <Badge className="bg-gradient-to-r from-brand-accent to-brand-secondary text-white border-0 shadow-lg">
                <Star className="h-3 w-3 mr-1" />
                {t('properties.featured')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-muted-foreground mb-4 p-3 bg-brand-primary-20 rounded-lg border border-brand-primary-20">
            <MapPin className="h-5 w-5 mr-3 text-brand-primary" />
            <span className="font-medium">{property.address}</span>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8 text-sm flex-wrap">
            <div className="flex items-center gap-2 p-2 bg-brand-primary-20 rounded-lg border border-brand-primary-20">
              <Users className="h-4 w-4 text-brand-primary" />
              <span className="font-semibold text-foreground">{property.capacity}-{property.capacity_max} {t('booking.guests')}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-brand-secondary-20 rounded-lg border border-brand-secondary-20">
              <Bed className="h-4 w-4 text-brand-secondary" />
              <span className="font-semibold text-foreground">{property.bedroom_count} {t('properties.bedrooms')}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-brand-accent-20 rounded-lg border border-brand-accent-20">
              <Bath className="h-4 w-4 text-brand-accent" />
              <span className="font-semibold text-foreground">{property.bathroom_count} {t('properties.bathrooms')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="border-brand-primary/30 hover:bg-brand-primary-20 hover:border-brand-primary/50 transition-all duration-200">
            <Heart className="h-4 w-4 mr-2 text-brand-primary" />
            {t('properties.save')}
          </Button>
          <Button variant="outline" size="sm" className="border-brand-primary/30 hover:bg-brand-primary-20 hover:border-brand-primary/50 transition-all duration-200">
            <Share2 className="h-4 w-4 mr-2 text-brand-primary" />
            {t('properties.share')}
          </Button>
        </div>
      </div>
    </div>
  );
};