import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { PropertyOverview } from './PropertyOverview';
import { PropertyAmenities } from './PropertyAmenities';
import { PropertyPolicies } from './PropertyPolicies';
import { PropertyLocation } from './PropertyLocation';
import { PropertyWithDetails } from '@/types/property';

interface PropertyTabsProps {
  property: PropertyWithDetails;
  formatTime: (time: string) => string;
}

export const PropertyTabs: React.FC<PropertyTabsProps> = ({ property, formatTime }) => {
  const { t } = useTranslation();

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">{t('properties.overview')}</TabsTrigger>
        <TabsTrigger value="amenities">{t('properties.amenities')}</TabsTrigger>
        <TabsTrigger value="policies">{t('properties.policies')}</TabsTrigger>
        <TabsTrigger value="location">{t('properties.location')}</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6">
        <PropertyOverview property={property} formatTime={formatTime} />
      </TabsContent>

      <TabsContent value="amenities">
        <PropertyAmenities amenities={property.amenities} />
      </TabsContent>

      <TabsContent value="policies">
        <PropertyPolicies property={property} />
      </TabsContent>

      <TabsContent value="location">
        <PropertyLocation property={property} />
      </TabsContent>
    </Tabs>
  );
};