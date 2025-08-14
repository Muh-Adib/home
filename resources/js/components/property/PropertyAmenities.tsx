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
    <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
        <CardTitle className="text-foreground">
          {t('properties.amenities')} ({amenities?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {Object.keys(amenitiesByCategory).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(amenitiesByCategory).map(([category, categoryAmenities]) => (
              <div key={category} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                <h3 className="text-xl font-semibold mb-4 capitalize text-foreground border-b border-primary/20 pb-2">
                  {category.replace('_', ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Alert className="bg-muted/50 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              {t('properties.no_amenities_info')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};