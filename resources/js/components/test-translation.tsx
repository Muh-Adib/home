import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TestTranslation = () => {
  const { t, i18n } = useTranslation();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('common.loading')}</span>
          <Badge variant="outline">{i18n.language}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p><strong>{t('auth.email')}:</strong> {t('booking.enter_email')}</p>
        <p><strong>{t('auth.name')}:</strong> {t('booking.enter_full_name')}</p>
        <p><strong>{t('booking.check_in')}:</strong> {t('booking.check_in_time')}</p>
        <p><strong>{t('common.total')}:</strong> {t('pricing.total_price')}</p>
        <p><strong>{t('common.cancel')}:</strong> {t('common.submit')}</p>
      </CardContent>
    </Card>
  );
};

export default TestTranslation; 