import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    FileText,
    Search,
    Download,
    Trash2,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    AlertTriangle,
    Info,
    XCircle,
    CheckCircle,
    Filter,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import { cn } from '@/lib/utils';

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context: string;
    stack_trace: string;
}

interface LogData {
    data: LogEntry[];
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
}

interface LogStatistics {
    total_entries: number;
    by_level: Record<string, number>;
    file_size: string;
    last_modified: string;
}

interface LogFile {
    name: string;
    path: string;
    size: string;
    modified: string;
}

interface SystemLogsProps {
    logs: LogData;
    statistics: LogStatistics;
    availableFiles: LogFile[];
    filters: {
        level?: string;
        search?: string;
        date_from?: string;
        date_to?: string;
    };
    currentFile: string;
}

export default function SystemLogs({ logs, statistics, availableFiles, filters, currentFile }: SystemLogsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedLevel, setSelectedLevel] = useState(filters.level || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [selectedFile, setSelectedFile] = useState(currentFile);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Settings', href: '/admin/settings' },
        { title: 'System', href: '/admin/settings/system' },
        { title: 'Logs', href: '#' },
    ];

    const logLevels = [
        { value: '', label: 'All Levels' },
        { value: 'emergency', label: 'Emergency', color: 'bg-red-900 text-white' },
        { value: 'alert', label: 'Alert', color: 'bg-red-700 text-white' },
        { value: 'critical', label: 'Critical', color: 'bg-red-600 text-white' },
        { value: 'error', label: 'Error', color: 'bg-red-500 text-white' },
        { value: 'warning', label: 'Warning', color: 'bg-yellow-500 text-white' },
        { value: 'notice', label: 'Notice', color: 'bg-blue-500 text-white' },
        { value: 'info', label: 'Info', color: 'bg-blue-400 text-white' },
        { value: 'debug', label: 'Debug', color: 'bg-gray-500 text-white' },
    ];

    const getLevelIcon = (level: string) => {
        const levelLower = level.toLowerCase();
        switch (levelLower) {
            case 'emergency':
            case 'alert':
            case 'critical':
            case 'error':
                return <XCircle className="h-4 w-4" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4" />;
            case 'notice':
            case 'info':
                return <Info className="h-4 w-4" />;
            case 'debug':
                return <CheckCircle className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getLevelBadge = (level: string) => {
        const levelData = logLevels.find(l => l.value === level.toLowerCase());
        return (
            <Badge className={cn('flex items-center gap-1', levelData?.color || 'bg-gray-500 text-white')}>
                {getLevelIcon(level)}
                {level.toUpperCase()}
            </Badge>
        );
    };

    const handleFilter = () => {
        router.get('/admin/settings/system/logs', {
            file: selectedFile,
            level: selectedLevel,
            search: searchQuery,
            date_from: dateFrom,
            date_to: dateTo,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFileChange = (fileName: string) => {
        setSelectedFile(fileName);
        router.get('/admin/settings/system/logs', {
            file: fileName,
            level: selectedLevel,
            search: searchQuery,
            date_from: dateFrom,
            date_to: dateTo,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedLevel('');
        setDateFrom('');
        setDateTo('');
        router.get('/admin/settings/system/logs', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get('/admin/settings/system/logs', {
            ...filters,
            page,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDownload = () => {
        window.location.href = `/admin/settings/system/logs/download?file=${selectedFile}`;
    };

    const handleClearLogs = (action: 'archive' | 'delete' = 'archive') => {
        const actionText = action === 'archive' ? 'mengarsipkan' : 'menghapus';
        const confirmText = action === 'archive'
            ? 'Log akan dipindahkan ke folder archive. Anda masih bisa mengaksesnya nanti.'
            : 'Log akan dihapus permanen. Tindakan ini tidak dapat dibatalkan!';

        if (confirm(`Apakah Anda yakin ingin ${actionText} log file?\n\n${confirmText}`)) {
            router.post('/admin/settings/system/logs/clear', {
                file: selectedFile === 'laravel.log' ? undefined : selectedFile,
                action: action,
            });
        }
    };

    const toggleRow = (index: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedRows(newExpanded);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="System Logs - Admin Dashboard" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FileText className="h-8 w-8 text-blue-600" />
                            System Logs
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Monitor dan analisis log sistem aplikasi
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownload}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button variant="outline" onClick={() => handleClearLogs('archive')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Archive Logs
                        </Button>
                        <Button variant="destructive" onClick={() => handleClearLogs('delete')}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Logs
                        </Button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Total Entries
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{statistics.total_entries.toLocaleString()}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                File Size
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{statistics.file_size}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Errors
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-red-600">
                                {(statistics.by_level.error || 0) + (statistics.by_level.critical || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Warnings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-yellow-600">
                                {statistics.by_level.warning || 0}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* File Selector */}
                        <div>
                            <Label htmlFor="file">Log File</Label>
                            <Select value={selectedFile} onValueChange={handleFileChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select log file" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFiles.map(file => (
                                        <SelectItem key={file.name} value={file.name}>
                                            {file.name} ({file.size})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                Current: {selectedFile} ({statistics.file_size})
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search logs..."
                                        className="pl-10"
                                        onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="level">Log Level</Label>
                                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Levels" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {logLevels.map(level => (
                                            <SelectItem key={level.value} value={level.value}>
                                                {level.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="date_from">Date From</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                />
                            </div>

                            <div>
                                <Label htmlFor="date_to">Date To</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleFilter}>
                                <Search className="h-4 w-4 mr-2" />
                                Apply Filters
                            </Button>
                            <Button variant="outline" onClick={handleClearFilters}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Log Entries */}
                <Card>
                    <CardHeader>
                        <CardTitle>Log Entries ({logs.total} total)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {logs.data.length === 0 ? (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription>
                                    No log entries found. Try adjusting your filters.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-2">
                                {logs.data.map((entry, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => toggleRow(index)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0">
                                                {getLevelBadge(entry.level)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {entry.timestamp}
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 break-words">
                                                    {entry.message}
                                                </p>

                                                {expandedRows.has(index) && (
                                                    <div className="mt-3 space-y-2">
                                                        {entry.context && (
                                                            <div>
                                                                <Label className="text-xs font-semibold text-gray-700">Context:</Label>
                                                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                                                    {entry.context}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {entry.stack_trace && (
                                                            <div>
                                                                <Label className="text-xs font-semibold text-gray-700">Stack Trace:</Label>
                                                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-64 overflow-y-auto">
                                                                    {entry.stack_trace}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {logs.last_page > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-6 border-t">
                                <p className="text-sm text-gray-600">
                                    Showing {((logs.current_page - 1) * logs.per_page) + 1} to {Math.min(logs.current_page * logs.per_page, logs.total)} of {logs.total} entries
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(logs.current_page - 1)}
                                        disabled={logs.current_page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(logs.current_page + 1)}
                                        disabled={logs.current_page === logs.last_page}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
