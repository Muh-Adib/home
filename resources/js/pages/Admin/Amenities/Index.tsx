import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { BreadcrumbItem } from '@/types';

interface Amenity {
    id: number;
    name: string;
    icon: string;
    category: string;
    description: string;
    is_active: boolean;
    sort_order: number;
    properties_count?: number;
}

interface AmenitiesIndexProps {
    amenities: {
        data: Amenity[];
        total: number;
    };
    categories: string[];
}

const categoryLabels: Record<string, string> = {
    basic: 'Basic Amenities',
    kitchen: 'Kitchen & Dining',
    bathroom: 'Bathroom',
    entertainment: 'Entertainment',
    outdoor: 'Outdoor',
    safety: 'Safety & Security',
};

export default function AmenitiesIndex({ amenities, categories }: AmenitiesIndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Amenities', href: '/admin/amenities' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Amenities Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Amenities Management</h1>
                        <p className="text-gray-600 mt-1">Manage property amenities and features</p>
                    </div>
                    <Link href={route('admin.amenities.create')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Amenity
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{amenities.total}</div>
                            <p className="text-gray-600">Total Amenities</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold text-green-600">
                                {amenities.data.filter(a => a.is_active).length}
                            </div>
                            <p className="text-gray-600">Active</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="text-2xl font-bold">{categories.length}</div>
                            <p className="text-gray-600">Categories</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Amenities List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Amenities List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Name</th>
                                        <th className="text-left py-3 px-4">Category</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                        <th className="text-left py-3 px-4">Properties</th>
                                        <th className="text-left py-3 px-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {amenities.data.map((amenity) => (
                                        <tr key={amenity.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                        <span className="text-blue-600 text-sm">
                                                            {amenity.icon || '🏠'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{amenity.name}</div>
                                                        {amenity.description && (
                                                            <div className="text-sm text-gray-500">
                                                                {amenity.description.substring(0, 50)}...
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="outline">
                                                    {categoryLabels[amenity.category] || amenity.category}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant={amenity.is_active ? "default" : "secondary"}>
                                                    {amenity.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm text-gray-600">
                                                    {amenity.properties_count || 0} properties
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex space-x-2">
                                                    <Link href={route('admin.amenities.edit', amenity.id)}>
                                                        <Button variant="outline" size="sm">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="outline" size="sm" className="text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
} 
