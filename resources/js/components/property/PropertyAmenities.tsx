import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AmenityItem from '@/components/AmenityItem';
import { Amenity } from '@/types';

interface PropertyAmenitiesProps {
  amenities: Amenity[];
}

export const PropertyAmenities: React.FC<PropertyAmenitiesProps> = ({ amenities }) => {
  const { t } = useTranslation();

  const amenitiesByCategory = amenities?.reduce((acc: Record<string, Amenity[]>, amenity) => {
    const category = amenity.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(amenity);
    return acc;
  }, {}) || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('properties.amenities')} ({amenities?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(amenitiesByCategory).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(amenitiesByCategory).map(([category, categoryAmenities]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 capitalize">
                  {category.replace('_', ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryAmenities.map((amenity) => (
                    <AmenityItem 
                      key={amenity.id}
                      amenity={amenity}
                      variant="list"
                      showName={true}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {t('properties.no_amenities_info')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};