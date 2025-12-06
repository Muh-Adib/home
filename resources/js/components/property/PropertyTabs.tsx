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
      <div className="overflow-x-auto">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg min-w-max">
          <TabsTrigger value="overview" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md text-xs sm:text-sm">{t('properties.overview')}</TabsTrigger>
          <TabsTrigger value="amenities" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md text-xs sm:text-sm">{t('properties.amenities')}</TabsTrigger>
          <TabsTrigger value="policies" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md text-xs sm:text-sm">{t('properties.policies')}</TabsTrigger>
          <TabsTrigger value="location" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md text-xs sm:text-sm">{t('properties.location')}</TabsTrigger>
        </TabsList>
      </div>
      
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