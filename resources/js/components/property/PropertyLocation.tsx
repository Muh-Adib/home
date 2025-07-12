import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Map } from '@/components/ui/map';
import { PropertyWithDetails } from '@/types/property';

interface PropertyLocationProps {
  property: PropertyWithDetails;
}

export const PropertyLocation: React.FC<PropertyLocationProps> = ({ property }) => {
  const { t } = useTranslation();

  // Improved coordinate validation
  const isValidCoordinate = (coord: number | undefined) => {
    return coord !== undefined && coord !== null && !isNaN(Number(coord)) && isFinite(Number(coord)) && Number(coord) !== 0;
  };

  const lat = Number(property.lat);
  const lng = Number(property.lng);
  const hasValidCoordinates = isValidCoordinate(lat) && isValidCoordinate(lng);

  console.log('📍 PropertyLocation Debug:', {
    originalLat: property.lat,
    originalLng: property.lng,
    parsedLat: lat,
    parsedLng: lng,
    hasValidCoordinates,
    propertyName: property.name
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t('properties.location_area')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">{t('properties.address')}</Label>
            <p className="text-lg">{property.address}</p>
          </div>
          
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {hasValidCoordinates ? (
              <Map
                lat={lat}
                lng={lng}
                height="400px"
                propertyName={property.name}
                address={property.address}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2" />
                  <p>Peta tidak tersedia</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Koordinat: {property.lat || 'null'}, {property.lng || 'null'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {!isValidCoordinate(lat) && 'Latitude tidak valid'}
                    {!isValidCoordinate(lat) && !isValidCoordinate(lng) && ' • '}
                    {!isValidCoordinate(lng) && 'Longitude tidak valid'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};