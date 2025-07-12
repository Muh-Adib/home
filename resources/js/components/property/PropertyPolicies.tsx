import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { PropertyWithDetails } from '@/types/property';

interface PropertyPoliciesProps {
  property: PropertyWithDetails;
}

export const PropertyPolicies: React.FC<PropertyPoliciesProps> = ({ property }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('properties.house_rules_policies')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {property.house_rules && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t('properties.house_rules')}</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {property.house_rules}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};