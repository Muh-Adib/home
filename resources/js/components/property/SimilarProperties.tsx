import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import PropertyCard from '@/components/PropertyCard';
import { Property } from '@/types/property';

interface SimilarPropertiesProps {
  properties: Property[];
}

export const SimilarProperties: React.FC<SimilarPropertiesProps> = ({ properties }) => {
  const { t } = useTranslation();

  if (!properties || properties.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('properties.similar_properties')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {properties.slice(0, 4).map((property) => (
            <PropertyCard 
              key={property.slug}
              property={property}
              viewMode="grid"
              maxAmenities={3}
              className="shadow-sm"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};