import React, { memo, useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Building2, Users, DollarSign, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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

function useMediaQuery(query: string) {
    const [value, setValue] = useState(false);

    useEffect(() => {
        function onChange(event: MediaQueryListEvent) {
            setValue(event.matches);
        }

        const result = matchMedia(query);
        result.addEventListener("change", onChange);
        setValue(result.matches);

        return () => result.removeEventListener("change", onChange);
    }, [query]);

    return value;
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
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const PropertyListContent = (
        <Command>
            <CommandInput placeholder="Cari properti..." />
            <CommandList>
                <CommandEmpty>Properti tidak ditemukan.</CommandEmpty>
                <CommandGroup>
                    {properties.map((property) => (
                        <CommandItem
                            key={property.id}
                            value={property.id.toString()}
                            keywords={[property.name, property.address]}
                            onSelect={() => {
                                onPropertyChange(property.id.toString());
                                setOpen(false);
                            }}
                            className="cursor-pointer"
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedPropertyId === property.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                )}
                            />
                            <div className="flex flex-col">
                                <span>{property.name}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{property.address}</span>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    );

    const TriggerButton = (
        <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Pilih properti"
            className={cn(
                "w-full justify-between font-normal",
                !selectedPropertyId && "text-muted-foreground",
                error && "border-red-500"
            )}
            disabled={disabled}
        >
            {selectedPropertyId
                ? properties.find((property) => property.id.toString() === selectedPropertyId)?.name
                : "Pilih properti..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
    );

    return (
        <div className="space-y-3">
            <div>
                <Label htmlFor="property_id" className={error ? 'text-red-500' : ''}>{label}</Label>

                {isDesktop ? (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            {TriggerButton}
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            {PropertyListContent}
                        </PopoverContent>
                    </Popover>
                ) : (
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger asChild>
                            {TriggerButton}
                        </DrawerTrigger>
                        <DrawerContent>
                            <div className="mt-4 border-t">
                                {PropertyListContent}
                            </div>
                        </DrawerContent>
                    </Drawer>
                )}

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
