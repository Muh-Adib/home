import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface GuestSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
    className?: string;
}

export default function GuestSearchBar({
    value,
    onChange,
    placeholder = 'Search guest by name...',
    onClear,
    className = ''
}: GuestSearchBarProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleClear = () => {
        onChange('');
        onClear?.();
    };

    return (
        <div className={`relative flex-1 ${className}`}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={handleChange}
                className="pl-10 pr-10 h-10"
            />
            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
            )}
        </div>
    );
}
