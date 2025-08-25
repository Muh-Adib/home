import React from 'react';
import { CreditCard } from 'lucide-react';

interface PaymentOptionsFormProps {
    dpPercentage: number;
    onDpPercentageChange: (percentage: number) => void;
}

const dpOptions = [
    { value: 50, label: '50% Down Payment', description: 'Pay 50% now, 50% later' },
    { value: 70, label: '70% Down Payment', description: 'Pay 70% now, 30% later' },
    { value: 100, label: '100% Full Payment', description: 'Pay 100% now' },
];

export default function PaymentOptionsForm({
    dpPercentage,
    onDpPercentageChange
}: PaymentOptionsFormProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Payment Option</h3>
            </div>

            <div className="grid gap-3">
                {dpOptions.map((option) => (
                    <div
                        key={option.value}
                        className={`border rounded-lg p-4 sm:p-6 cursor-pointer transition-colors ${
                            dpPercentage === option.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => onDpPercentageChange(option.value)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="font-medium text-base text-foreground">{option.label}</div>
                                <div className="text-sm text-muted-foreground mt-1">{option.description}</div>
                            </div>
                            <div className="flex items-center ml-4">
                                <input
                                    type="radio"
                                    name="dp_percentage"
                                    value={option.value}
                                    checked={dpPercentage === option.value}
                                    onChange={() => onDpPercentageChange(option.value)}
                                    className="text-primary w-4 h-4"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
