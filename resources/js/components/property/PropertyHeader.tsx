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
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link href="/properties" className="hover:text-blue-600 transition-colors">
          {t('properties.properties')}
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{property.name}</span>
      </div>
      
      {/* Header Content */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              {property.name}
            </h1>
            {property.is_featured && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Star className="h-3 w-3 mr-1" />
                {t('properties.featured')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-gray-600 mb-3">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{property.address}</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{property.capacity}-{property.capacity_max} {t('booking.guests')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedroom_count} {t('properties.bedrooms')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathroom_count} {t('properties.bathrooms')}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Heart className="h-4 w-4 mr-2" />
            {t('properties.save')}
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            {t('properties.share')}
          </Button>
        </div>
      </div>
    </div>
  );
};