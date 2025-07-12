import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, Users, Bed, Bath, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PropertyWithDetails } from '@/types/property';

interface PropertyOverviewProps {
  property: PropertyWithDetails;
  formatTime: (time: string) => string;
}

export const PropertyOverview: React.FC<PropertyOverviewProps> = ({ property, formatTime }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('properties.description')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {property.description}
          </p>
        </CardContent>
      </Card>

      {/* Property Features */}
      <Card>
        <CardHeader>
          <CardTitle>{t('properties.property_features')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold">{property.capacity}-{property.capacity_max}</p>
              <p className="text-sm text-gray-600">{t('booking.guests')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Bed className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold">{property.bedroom_count}</p>
              <p className="text-sm text-gray-600">{t('properties.bedrooms')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Bath className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="font-semibold">{property.bathroom_count}</p>
              <p className="text-sm text-gray-600">{t('properties.bathrooms')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('properties.check_in_information')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">{t('properties.check_in_time')}</Label>
              <p className="text-lg font-semibold">{formatTime(property.check_in_time)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">{t('properties.check_out_time')}</Label>
              <p className="text-lg font-semibold">{formatTime(property.check_out_time)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">{t('properties.minimum_stay_weekday')}</Label>
              <p className="font-semibold">{property.min_stay_weekday} {t('booking.nights')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">{t('properties.minimum_stay_weekend')}</Label>
              <p className="font-semibold">{property.min_stay_weekend} {t('booking.nights')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">{t('properties.minimum_stay_peak')}</Label>
              <p className="font-semibold">{property.min_stay_peak} {t('booking.nights')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};