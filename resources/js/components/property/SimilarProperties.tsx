import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import PropertyCardEnhanced from '@/components/ui/property-card-enhanced';
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
    <Card className="shadow-xl border-0 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
        <CardTitle className="text-foreground text-center text-2xl">
          {t('properties.similar_properties')}
        </CardTitle>
        <p className="text-muted-foreground text-center mt-2">
          Temukan properti serupa yang mungkin menarik untuk Anda
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.slice(0, 8).map((property) => (
            <PropertyCardEnhanced 
              key={property.slug}
              property={property}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};