import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Download, Upload, Settings } from 'lucide-react';

interface BookingActionsMenuProps {
    onExport: () => void;
    onImport: () => void;
}

export default function BookingActionsMenu({
    onExport,
    onImport,
}: BookingActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="More actions"
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExport} className="cursor-pointer">
                    <Download className="h-4 w-4 mr-2" />
                    Export Bookings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onImport} className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Bookings
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
