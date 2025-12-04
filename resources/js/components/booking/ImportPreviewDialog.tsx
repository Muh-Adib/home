import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Edit, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import BookingManualInputDialog from './BookingManualInputDialog';
import { toast } from 'sonner';

interface ImportPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preview: ImportPreview | null;
    onConfirm: (acceptedRows: number[]) => void;
    loading?: boolean;
}

interface ImportPreview {
    new: PreviewItem[];
    updated: UpdatedItem[];
    unchanged: UnchangedItem[];
    errors: ErrorItem[];
}

interface PreviewItem {
    row: number;
    booking_number: string | null;
    data: any;
    is_new?: boolean;
    availability_warning?: string | null;
}

interface UpdatedItem extends PreviewItem {
    changes: Record<string, { old: any; new: any }>;
    old_data: any;
    new_data: any;
}

interface UnchangedItem {
    row: number;
    booking_number: string;
}

interface ErrorItem {
    row: number;
    error: string;
    data: any;
    is_new?: boolean;
    missing_fields?: string[];
}

// Type for items that can be edited (new, updated, unchanged, or error items)
type EditableItem = Omit<ErrorItem, 'error'> & {
    error?: string;
    booking_number?: string | null;
};

export function ImportPreviewDialog({ open, onOpenChange, preview, onConfirm, loading }: ImportPreviewDialogProps) {
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [manualInputOpen, setManualInputOpen] = useState(false);
    const [editingRow, setEditingRow] = useState<EditableItem | null>(null);
    const [completedData, setCompletedData] = useState<Map<number, any>>(new Map());

    // Auto-select all new and updated rows by default (except those with errors)
    useMemo(() => {
        if (preview) {
            const autoSelect = new Set<number>();
            preview.new.forEach(item => {
                // Only auto-select if no availability warning or if data is complete
                if (!item.availability_warning) {
                    autoSelect.add(item.row);
                }
            });
            preview.updated.forEach(item => autoSelect.add(item.row));
            setSelectedRows(autoSelect);
        }
    }, [preview]);

    if (!preview) return null;

    const handleToggleRow = (row: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(row)) {
            newSelected.delete(row);
        } else {
            newSelected.add(row);
        }
        setSelectedRows(newSelected);
    };

    const handleSelectAll = () => {
        const allRows = new Set<number>();
        preview.new.forEach(item => {
            if (!item.availability_warning) allRows.add(item.row);
        });
        preview.updated.forEach(item => allRows.add(item.row));
        setSelectedRows(allRows);
    };

    const handleDeselectAll = () => {
        setSelectedRows(new Set());
    };

    const handleCompleteData = (item: EditableItem) => {
        console.log('Opening edit dialog for row:', item.row);
        console.log('Item data:', item.data);
        console.log('Completed data for this row:', completedData.get(item.row));
        setEditingRow(item);
        setManualInputOpen(true);
    };

    const handleSaveCompletedData = (data: any) => {
        if (editingRow) {
            const newCompletedData = new Map(completedData);
            newCompletedData.set(editingRow.row, data);
            setCompletedData(newCompletedData);

            // Add to selected rows
            const newSelected = new Set(selectedRows);
            newSelected.add(editingRow.row);
            setSelectedRows(newSelected);

            toast.success('Data completed! Row will be included in import.');
        }
        setManualInputOpen(false);
        setEditingRow(null);
    };

    const handleConfirm = () => {
        // Validate selected rows
        const validRows: number[] = [];
        const invalidRows: number[] = [];

        selectedRows.forEach(row => {
            // Check if row has missing fields error
            const errorItem = preview.errors.find(e => e.row === row && e.missing_fields);

            if (errorItem && !completedData.has(row)) {
                invalidRows.push(row);
            } else {
                validRows.push(row);
            }
        });

        if (invalidRows.length > 0) {
            toast.error(
                `Cannot import ${invalidRows.length} row(s) with incomplete data. Please complete the data first or deselect them.`
            );
            return;
        }

        if (validRows.length === 0) {
            toast.error('No valid rows selected for import.');
            return;
        }

        // Pass both selected rows and completed data
        onConfirm(validRows);
    };

    const summary = {
        new: preview.new.length,
        updated: preview.updated.length,
        unchanged: preview.unchanged.length,
        errors: preview.errors.length,
    };

    // Separate incomplete errors from other errors
    const incompleteErrors = preview.errors.filter(e => e.missing_fields && e.missing_fields.length > 0);
    const otherErrors = preview.errors.filter(e => !e.missing_fields || e.missing_fields.length === 0);

    return (
        <>
            <Dialog open={open} onOpenChange={(newOpen) => {
                if (manualInputOpen) return; // Prevent closing if manual input is open
                if (!newOpen) {
                    if (window.confirm('Are you sure you want to close? All import progress will be lost.')) {
                        onOpenChange(false);
                    }
                } else {
                    onOpenChange(true);
                }
            }}>
                <DialogContent className="max-w-5xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Import Preview</DialogTitle>
                        <DialogDescription>
                            Review the changes before importing. Select which rows to import.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">New</div>
                                <div className="text-lg font-semibold">{summary.new}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">Updated</div>
                                <div className="text-lg font-semibold">{summary.updated}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <CheckCircle className="h-4 w-4 text-gray-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">Unchanged</div>
                                <div className="text-lg font-semibold">{summary.unchanged}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <div>
                                <div className="text-xs text-muted-foreground">Errors</div>
                                <div className="text-lg font-semibold">{summary.errors}</div>
                            </div>
                        </div>
                    </div>

                    {/* Errors Alert */}
                    {incompleteErrors.length > 0 && (
                        <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                                {incompleteErrors.length} new booking(s) have incomplete data. Click "Complete Data" to fill in missing information.
                            </AlertDescription>
                        </Alert>
                    )}

                    {otherErrors.length > 0 && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                                {otherErrors.length} row(s) have errors and cannot be imported.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Availability Warnings for New Bookings */}
                    {preview.new.filter(item => item.availability_warning).length > 0 && (
                        <Alert className="bg-orange-50 border-orange-200">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                                {preview.new.filter(item => item.availability_warning).length} new booking(s) have date conflicts and cannot be imported.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Availability Warnings for Updated Bookings */}
                    {preview.updated.filter(item => item.availability_warning).length > 0 && (
                        <Alert className="bg-orange-50 border-orange-200">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <AlertDescription className="text-orange-800">
                                {preview.updated.filter(item => item.availability_warning).length} booking update(s) have date conflicts with existing bookings.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Preview Table */}
                    <ScrollArea className="h-[450px] border rounded-md">
                        <div className="min-w-[800px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12 sticky left-0 bg-background z-10">
                                            <Checkbox
                                                checked={selectedRows.size > 0 && selectedRows.size === (summary.new + summary.updated - incompleteErrors.length)}
                                                onCheckedChange={(checked) => checked ? handleSelectAll() : handleDeselectAll()}
                                            />
                                        </TableHead>
                                        <TableHead className="w-16">Row</TableHead>
                                        <TableHead className="w-32">Status</TableHead>
                                        <TableHead className="w-40">Guest Name</TableHead>
                                        <TableHead className="w-32">Booking #</TableHead>
                                        <TableHead className="min-w-[200px]">Details</TableHead>
                                        <TableHead className="w-32">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* New Bookings */}
                                    {preview.new.map((item) => (
                                        <TableRow key={`new-${item.row}`} className="h-14">
                                            <TableCell className="sticky left-0 bg-background">
                                                <Checkbox
                                                    checked={selectedRows.has(item.row)}
                                                    onCheckedChange={() => handleToggleRow(item.row)}
                                                    disabled={!!item.availability_warning}
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm">{item.row}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="default" className="bg-green-600 text-xs">New</Badge>
                                                    {item.is_new && !item.booking_number && (
                                                        <Badge variant="outline" className="border-blue-500 text-blue-700 text-xs">
                                                            Auto
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                {item.data?.guest_name || <span className="text-muted-foreground italic">-</span>}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {item.booking_number || <span className="text-muted-foreground italic">Auto</span>}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {item.availability_warning ? (
                                                    <div className="flex items-center gap-1 text-orange-600">
                                                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                                        <span>{item.availability_warning}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">New booking</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCompleteData({ row: item.row, data: item.data, is_new: true })}
                                                    className="h-8 text-xs"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Incomplete Data (Errors with missing fields) */}
                                    {incompleteErrors.map((item) => (
                                        <TableRow key={`incomplete-${item.row}`} className={`h-14 ${completedData.has(item.row) ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                            <TableCell className="sticky left-0 bg-inherit">
                                                <Checkbox
                                                    checked={selectedRows.has(item.row)}
                                                    onCheckedChange={() => handleToggleRow(item.row)}
                                                    disabled={!completedData.has(item.row)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm">{item.row}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="default" className="bg-green-600 text-xs">New</Badge>
                                                    {completedData.has(item.row) ? (
                                                        <Badge variant="default" className="bg-green-500 text-xs">Done</Badge>
                                                    ) : (
                                                        <Badge variant="default" className="bg-yellow-600 text-xs">Incomplete</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                {item.data?.guest_name || <span className="text-muted-foreground italic">Missing</span>}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs italic text-muted-foreground">Auto</TableCell>
                                            <TableCell className="text-xs text-yellow-800">
                                                Missing: {item.missing_fields?.slice(0, 2).join(', ')}
                                                {item.missing_fields && item.missing_fields.length > 2 && ` +${item.missing_fields.length - 2}`}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCompleteData(item)}
                                                    className="h-8 text-xs"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    {completedData.has(item.row) ? 'Edit' : 'Complete'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Updated Bookings */}
                                    {preview.updated.map((item) => (
                                        <TableRow key={`updated-${item.row}`} className={cn("h-14", item.availability_warning && "bg-orange-50")}>
                                            <TableCell className="sticky left-0 bg-inherit">
                                                <Checkbox
                                                    checked={selectedRows.has(item.row)}
                                                    onCheckedChange={() => handleToggleRow(item.row)}
                                                    disabled={!!item.availability_warning}
                                                />
                                            </TableCell>
                                            <TableCell className="text-sm">{item.row}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="default" className="bg-blue-600 text-xs">Updated</Badge>
                                                    {item.availability_warning && (
                                                        <Badge variant="outline" className="border-orange-500 text-orange-700 text-xs">
                                                            Conflict
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                {item.new_data?.guest_name || item.old_data?.guest_name || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{item.booking_number}</TableCell>
                                            <TableCell>
                                                {item.availability_warning ? (
                                                    <div className="flex items-center gap-1 text-orange-600 text-xs">
                                                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                                        <span>{item.availability_warning}</span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-0.5 text-xs">
                                                        {Object.entries(item.changes).slice(0, 2).map(([field, change]) => (
                                                            <div key={field} className="flex items-center gap-1 truncate">
                                                                <span className="font-medium">{field}:</span>
                                                                <span className="text-red-600 line-through truncate max-w-[80px]">{String(change.old)}</span>
                                                                <span>→</span>
                                                                <span className="text-green-600 truncate max-w-[80px]">{String(change.new)}</span>
                                                            </div>
                                                        ))}
                                                        {Object.keys(item.changes).length > 2 && (
                                                            <div className="text-muted-foreground text-xs">
                                                                +{Object.keys(item.changes).length - 2} more
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCompleteData({ row: item.row, data: item.new_data, is_new: false, booking_number: item.booking_number })}
                                                    className="h-8 text-xs"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Unchanged Bookings */}
                                    {preview.unchanged.map((item) => (
                                        <TableRow key={`unchanged-${item.row}`} className="opacity-50 h-12">
                                            <TableCell className="sticky left-0 bg-background"></TableCell>
                                            <TableCell className="text-sm">{item.row}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">Unchanged</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">-</TableCell>
                                            <TableCell className="font-mono text-xs">{item.booking_number}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">No changes</TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCompleteData({ row: item.row, data: {}, is_new: false, booking_number: item.booking_number })}
                                                    className="h-8 text-xs"
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {/* Other Errors */}
                                    {otherErrors.map((item, idx) => (
                                        <TableRow key={`error-${idx}`} className="bg-red-50 h-14">
                                            <TableCell className="sticky left-0 bg-red-50"></TableCell>
                                            <TableCell className="text-sm">{item.row}</TableCell>
                                            <TableCell>
                                                <Badge variant="destructive" className="text-xs">Error</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">-</TableCell>
                                            <TableCell className="font-mono text-xs">-</TableCell>
                                            <TableCell className="text-xs text-red-600">{item.error}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
                        <div className="text-sm text-muted-foreground">
                            {selectedRows.size} row(s) selected for import
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to close? All import progress will be lost.')) {
                                        onOpenChange(false);
                                    }
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleConfirm}
                                disabled={selectedRows.size === 0 || loading}
                            >
                                {loading ? 'Importing...' : `Import ${selectedRows.size} Row(s)`}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Input Dialog */}
            {editingRow && (
                <BookingManualInputDialog
                    open={manualInputOpen}
                    onClose={() => {
                        setManualInputOpen(false);
                        setEditingRow(null);
                    }}
                    onSave={handleSaveCompletedData}
                    initialData={completedData.get(editingRow.row) || editingRow.data || {}}
                />
            )}
        </>
    );
}
