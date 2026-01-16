/**
 * Property Selector Component
 * Reusable property selection with preview
 * Context-agnostic: works for both admin and public (if needed)
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, Users, DollarSign } from 'lucide-react';
import type { Property } from '@/types';

export interface PropertySelectorProps {
    properties: Property[];
    selectedPropertyId: string;
    onPropertyChange: (propertyId: string) => void;
    currentProperty?: Property | null;
    error?: string;
    disabled?: boolean;
    showDetails?: boolean;
    label?: string;
}

const PropertySelector = memo(function PropertySelector({
    properties,
    selectedPropertyId,
    onPropertyChange,
    currentProperty,
    error,
    disabled = false,
    showDetails = true,
    label = 'Pilih Properti *',
}: PropertySelectorProps) {
    return (
        <div className="space-y-3">
            <div>
                <Label htmlFor="property_id">{label}</Label>
                <Select
                    value={selectedPropertyId}
                    onValueChange={onPropertyChange}
                    disabled={disabled}
                >
                    <SelectTrigger className={error ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Pilih properti" />
                    </SelectTrigger>
                    <SelectContent>
                        {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {property.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            </div>

            {/* Property Details Preview */}
            {showDetails && currentProperty && (
                <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        {currentProperty.cover_image && (
                            <img
                                src={currentProperty.cover_image}
                                alt={currentProperty.name}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                loading="lazy"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                                {currentProperty.name}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                                {currentProperty.address}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 flex-shrink-0" />
                                    <span>
                                        Cap: {currentProperty.capacity} - {currentProperty.capacity_max}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 flex-shrink-0" />
                                    <span>Base: {currentProperty.formatted_base_rate}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default PropertySelector;
