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

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
        <CardTitle className="text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {t('properties.location_area')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <Label className="text-sm font-medium text-muted-foreground">{t('properties.address')}</Label>
            <p className="text-xl font-semibold text-foreground mt-1">{property.address}</p>
          </div>
          
          <div className="aspect-video bg-muted/50 rounded-lg overflow-hidden border border-border/50 shadow-lg">
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
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-background">
                <div className="text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-primary/60" />
                  <p className="text-lg font-semibold text-foreground">Peta tidak tersedia</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Koordinat: {originalLat || 'null'}, {originalLng || 'null'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
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