import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Map } from '@/components/ui/map';
import { PropertyWithDetails } from '@/types/property';

interface PropertyLocationProps {
  property: PropertyWithDetails;
}

// Memoized PropertyLocation component to prevent unnecessary re-renders
export const PropertyLocation = React.memo<PropertyLocationProps>(({ property }) => {
  const { t } = useTranslation();

  // Memoize coordinate validation and parsing
  const coordinateData = useMemo(() => {
    // Improved coordinate validation
    const isValidCoordinate = (coord: number | undefined) => {
      return coord !== undefined && coord !== null && 
             !isNaN(Number(coord)) && isFinite(Number(coord)) && 
             Number(coord) !== 0;
    };

    const lat = Number(property.lat);
    const lng = Number(property.lng);
    const hasValidCoordinates = isValidCoordinate(lat) && isValidCoordinate(lng);

    return {
      lat,
      lng,
      hasValidCoordinates,
      originalLat: property.lat,
      originalLng: property.lng
    };
  }, [property.lat, property.lng]);

  const { lat, lng, hasValidCoordinates, originalLat, originalLng } = coordinateData;

  // Memoize debug info to prevent unnecessary console calls
  const debugInfo = useMemo(() => ({
    originalLat,
    originalLng,
    parsedLat: lat,
    parsedLng: lng,
    hasValidCoordinates,
    propertyName: property.name
  }), [originalLat, originalLng, lat, lng, hasValidCoordinates, property.name]);

  console.log('📍 PropertyLocation Debug:', debugInfo);

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
                    Koordinat: {originalLat || 'null'}, {originalLng || 'null'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {!coordinateData.hasValidCoordinates && 'Koordinat tidak valid'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});