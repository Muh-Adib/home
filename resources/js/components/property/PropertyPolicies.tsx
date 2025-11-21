import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { PropertyWithDetails } from '@/types/property';
import TextFormatMarkdown from '@/components/text-mark-down'

interface PropertyPoliciesProps {
  property: PropertyWithDetails;
}

export const PropertyPolicies: React.FC<PropertyPoliciesProps> = ({ property }) => {
  const { t } = useTranslation();

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
        <CardTitle className="text-foreground">
          {t('properties.house_rules_policies')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {property.house_rules && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
            <h3 className="text-xl font-semibold mb-4 text-foreground border-b border-primary/20 pb-2">
              {t('properties.house_rules')}
            </h3>
            <div className="text-foreground leading-relaxed text-lg">
            <TextFormatMarkdown text={property.description} />
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};