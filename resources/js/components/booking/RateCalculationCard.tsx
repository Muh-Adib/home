import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tag, Percent } from 'lucide-react';

interface RateCalculation {
    total_amount: number;
    nights: number;
    extra_bed_amount: number;
}

interface DiscountInfo {
    original_price: number;
    final_price: number;
    discount_amount: number;
    discount_percent: number;
    nights: number;
}

interface RateCalculationCardProps {
    rateCalculation: RateCalculation;
    discountInfo?: DiscountInfo;
    dpPercentage: number;
}

export default function RateCalculationCard({
    rateCalculation,
    discountInfo,
    dpPercentage
}: RateCalculationCardProps) {
    return (
        <Card className="shadow-xl border-0 bg-gradient-to-br from-card to-muted/30">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 p-4 sm:p-6 border-b border-red-200">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Tag className="h-5 w-5 text-red-600" />
                        Total Price
                    </CardTitle>
                    {discountInfo && (
                        <Badge variant="destructive" className="text-sm">
                            <Percent className="h-3 w-3 mr-1" />
                            {discountInfo.discount_percent}% OFF
                        </Badge>
                    )}
                </div>
                {/* Show discount prices */}
                {discountInfo && (
                    <div className="space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg text-muted-foreground line-through">
                                Rp {discountInfo.original_price.toLocaleString()}
                            </span>
                            <Badge variant="destructive" className="text-xs">
                                -{discountInfo.discount_percent}%
                            </Badge>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-red-600">
                                Rp {discountInfo.final_price.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground ml-1">total</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            (Rp {Math.round(discountInfo.final_price / discountInfo.nights).toLocaleString()}/night)
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <div className="space-y-4">
                    <div className="space-y-3 text-sm">
                        {/* Discount Price Display */}
                        {discountInfo && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Original Price</span>
                                    <span className="text-muted-foreground line-through">
                                        Rp {discountInfo.original_price.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Discount</span>
                                        <Badge variant="destructive" className="text-xs">
                                            {discountInfo.discount_percent}% OFF
                                        </Badge>
                                    </div>
                                    <span className="text-red-600 font-medium">
                                        -Rp {discountInfo.discount_amount.toLocaleString()}
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Additional Fees */}
                        {rateCalculation.extra_bed_amount > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Extra beds</span>
                                <span className="font-medium text-foreground">Rp {rateCalculation.extra_bed_amount.toLocaleString()}</span>
                            </div>
                        )}

                        <Separator />

                        {/* Final Total */}
                        <div className="flex justify-between items-center text-lg font-bold">
                            <span className="text-foreground">Total</span>
                            <span className="text-red-600">
                                Rp {rateCalculation.total_amount.toLocaleString()}
                            </span>
                        </div>

                        <div className="text-center text-xs text-green-600 bg-green-500/10 p-3 rounded border border-green-500/20">
                            ✓ All-inclusive price, no hidden fees
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-foreground">Down Payment ({dpPercentage}%)</span>
                            <span className="font-medium text-foreground">
                                Rp {(rateCalculation.total_amount * dpPercentage / 100).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Remaining</span>
                            <span>
                                Rp {(rateCalculation.total_amount * (100 - dpPercentage) / 100).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
