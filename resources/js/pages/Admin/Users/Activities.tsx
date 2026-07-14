import AdminLayout from '@/layouts/admin-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type User, type BreadcrumbItem, type PaginatedData } from '@/types';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Search, Clock, Activity, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ActivityLog {
    id: number;
    activity_type: string;
    description: string;
    reference_type?: string;
    reference_id?: number;
    properties?: any;
    created_at: string;
}

interface ActivitiesProps {
    targetUser: User;
    activities: PaginatedData<ActivityLog>;
    filters: {
        search?: string;
    };
}

export default function UserActivities({ targetUser, activities, filters }: ActivitiesProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'User Management', href: '/admin/users' },
        { title: `${targetUser.name} Activities` },
    ];

    const handleSearch = () => {
        router.get(`/admin/users/${targetUser.id}/activities`, {
            search: searchTerm || undefined,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/admin/users">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Log Aktivitas User</h1>
                            <p className="text-muted-foreground">
                                Riwayat log aktivitas dari <strong>{targetUser.name}</strong> ({targetUser.email})
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search-activities"
                                    placeholder="Cari aktivitas berdasarkan deskripsi..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-10"
                                />
                            </div>
                            <Button onClick={handleSearch} className="font-bold">
                                Cari
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table / Timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-600" />
                            Log Aktivitas ({activities.total})
                        </CardTitle>
                        <CardDescription>
                            Daftar log aktivitas yang dilakukan oleh user ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activities.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Waktu</TableHead>
                                            <TableHead className="w-[180px]">Tipe</TableHead>
                                            <TableHead>Deskripsi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activities.data.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-medium text-slate-600">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {formatDate(log.created_at)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 uppercase tracking-wider">
                                                        {log.activity_type.replace(/_/g, ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm font-semibold text-slate-800">
                                                    {log.description}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {activities.last_page > 1 && (
                                    <div className="flex items-center justify-between space-x-2 py-4">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {activities.from} to {activities.to} of {activities.total} logs
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {activities.links.map((link, index) => (
                                                <Button
                                                    key={index}
                                                    variant={link.active ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => link.url && router.visit(link.url)}
                                                    disabled={!link.url}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-8 w-8 text-slate-300" />
                                Belum ada aktivitas tercatat untuk user ini.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
