import React from 'react';
import { Button } from '@/components/ui/button';
import { 
    Grid3X3, 
    List, 
    BarChart3 
} from 'lucide-react';

interface ViewModeToggleProps {
    viewMode: 'card' | 'table' | 'timeline';
    onViewModeChange: (mode: 'card' | 'table' | 'timeline') => void;
}

export default function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
    const viewModes = [
        {
            key: 'card' as const,
            label: 'Cards',
            icon: Grid3X3,
            description: 'Grid layout with detailed cards'
        },
        {
            key: 'table' as const,
            label: 'Table',
            icon: List,
            description: 'Compact table format'
        },
        {
            key: 'timeline' as const,
            label: 'Timeline',
            icon: BarChart3,
            description: 'Visual timeline view'
        }
    ];

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View:</span>
            <div className="flex border rounded-lg p-1 bg-background">
                {viewModes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = viewMode === mode.key;
                    
                    return (
                        <Button
                            key={mode.key}
                            variant={isActive ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange(mode.key)}
                            className="h-8 px-3 relative group"
                            title={mode.description}
                        >
                            <Icon className="h-4 w-4 mr-1" />
                            {mode.label}
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                {mode.description}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
} 