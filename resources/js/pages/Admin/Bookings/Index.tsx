import AdminLayout from '@/layouts/admin-layout';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookingTimeline,
    BookingStats,
    BookingSearchBar,
    BookingActionsMenu
} from '@/components/booking';
import { type Booking, type BreadcrumbItem, type PageProps, type Property } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Calendar,
    Plus,
    RefreshCw, FileSpreadsheet
} from 'lucide-react';
import { useState, useCallback, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { ExportFilterDialog, type ExportFilters } from '@/components/booking/ExportFilterDialog';
import { ImportPreviewDialog } from '@/components/booking/ImportPreviewDialog';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { apiPostForm } from '@/lib/api';

interface BookingsIndexProps {
    properties: Property[];
    statistics?: {
        total_bookings: number;
        confirmed_bookings: number;
        pending_bookings: number;
        cancelled_bookings: number;
        total_revenue: number;
        pending_revenue: number;
        check_ins_today: number;
        check_outs_today: number;
    };
}

export default function BookingsIndex({ properties, statistics }: BookingsIndexProps) {
    const page = usePage<PageProps>();
    const { auth } = page.props;
    const isMobile = useIsMobile();

    // State management
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<any>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const { data: importData, setData: setImportData, post: postImport, processing: importProcessing, errors: importErrors, reset: resetImport } = useForm({
        file: null as File | null,
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Bookings' },
    ];

    // Check permissions for actions
    const canVerify = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCancel = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);
    const canCheckIn = ['super_admin', 'property_manager', 'front_desk'].includes(auth.user.role);

    // No filters needed - calendar is primary navigation
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        router.reload({
            only: ['properties', 'statistics'],
            onFinish: () => setIsRefreshing(false),
        });
    }, []);

    const handleExport = useCallback((exportFilters: ExportFilters) => {
        const queryParams = new URLSearchParams();

        // Add export filters
        if (exportFilters.date_from) queryParams.append('date_from', exportFilters.date_from);
        if (exportFilters.date_to) queryParams.append('date_to', exportFilters.date_to);
        if (exportFilters.property_id) queryParams.append('property_id', exportFilters.property_id);
        if (exportFilters.status) queryParams.append('status', exportFilters.status);

        // Export filters only (no page filters needed)
        // Create a temporary link and click it to trigger download
        const link = document.createElement('a');
        link.href = `/admin/bookings/export/download?${queryParams.toString()}`;
        link.download = 'bookings.xlsx'; // Fallback filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importData.file) {
            toast.error('Please select a file to import');
            return;
        }

        try {
            // First, get preview
            const formData = new FormData();
            formData.append('file', importData.file);

            const result = await apiPostForm<{ success: boolean; preview: any }>(
                '/admin/bookings/import/preview',
                formData
            );

            if (result.success) {
                setImportPreview(result.preview);
                setImportFile(importData.file);
                setIsImportOpen(false);
                setIsPreviewOpen(true);
            }
        } catch (error: any) {
            toast.error('Failed to preview import: ' + (error?.data?.error || error?.message));
            console.error(error);
        }
    };

    const handleConfirmImport = async (acceptedRows: number[]) => {
        if (!importFile) return;

        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            acceptedRows.forEach((row, index) => {
                formData.append(`accepted_rows[${index}]`, row.toString());
            });

            await apiPostForm('/admin/bookings/import/confirmed', formData);

            setIsPreviewOpen(false);
            setImportPreview(null);
            setImportFile(null);
            resetImport();
            toast.success('Bookings imported successfully');
            handleRefresh(); // Use refresh which reloads properties/stats
        } catch (error: any) {
            toast.error('Failed to import bookings: ' + (error?.data?.error || error?.message));
            console.error(error);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs} title="Booking Management" subtitle="Manage all property bookings">
            <div className='space-y-4'>
                {/* Compact Modern Header */}
                <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">

                    {/* Top Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                        {/* Title */}
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                                Booking Management
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                Manage guest bookings, reservations, and calendar timeline
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2">

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="flex sm:hidden"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="hidden sm:flex"
                            >
                                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>

                            <BookingActionsMenu
                                onExport={() => setIsExportOpen(true)}
                                onImport={() => setIsImportOpen(true)}
                            />

                            <Button
                                asChild
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                            >
                                <Link href="/admin/bookings/create">
                                    <Plus className="h-4 w-4 mr-1" />
                                    New Booking
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="w-full">
                        <BookingSearchBar placeholder="Search booking code, guest name, phone..." />
                    </div>

                </div>

                {/* Export Filter Dialog */}
                <ExportFilterDialog
                    open={isExportOpen}
                    onOpenChange={setIsExportOpen}
                    properties={properties}
                    onExport={handleExport}
                />

                {/* Import Dialog */}
                <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Import Bookings</DialogTitle>
                            <DialogDescription>
                                Upload an Excel or CSV file to import bookings.
                                The file should follow the standard format.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleImportSubmit} className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="import-file">Booking File</Label>
                                <Input
                                    id="import-file"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => setImportData('file', e.target.files ? e.target.files[0] : null)}
                                />
                                {importErrors.file && (
                                    <p className="text-sm text-destructive">{importErrors.file}</p>
                                )}
                            </div>

                            <div className="bg-muted p-3 rounded-md text-sm">
                                <div className="flex items-center gap-2 font-medium mb-1">
                                    <FileSpreadsheet className="h-4 w-4" />
                                    <span>Supported Columns</span>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    booking_number, property, guest_name, guest_email, check_in, check_out, status, payment_status, total_amount
                                </p>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={importProcessing}>
                                    {importProcessing ? 'Importing...' : 'Import Bookings'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Import Preview Dialog */}
                <ImportPreviewDialog
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    preview={importPreview}
                    onConfirm={handleConfirmImport}
                    loading={isImporting}
                />

                {/* Statistics - Collapsible on Mobile */}
                {statistics && (
                    <BookingStats
                        statistics={statistics}
                        defaultCollapsed={isMobile}
                        compactMode={isMobile}
                    />
                )}

                {/* Timeline Calendar - Client-Side Fetching */}
                <div className="space-y-4 max-w-full overflow-hidden">
                    <BookingTimeline
                        properties={properties}
                        cellWidth={isMobile ? 80 : 120}
                        canVerify={canVerify}
                        canCancel={canCancel}
                        canCheckIn={canCheckIn}
                        onRefresh={handleRefresh}
                        autoFetch={true}
                    />
                </div>
            </div>
        </AdminLayout>
    );
} 