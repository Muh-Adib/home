import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Settings, ImageIcon, Upload, Star } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MediaUpload from '@/components/MediaUpload';
import { PageProps } from '@/types';

interface Property {
    id: number;
    name: string;
    slug: string;
    address: string;
    status: string;
    base_rate: number;
    media: MediaItem[];
}

interface MediaItem {
    id: number;
    file_name: string;
    file_path: string;
    thumbnail_path?: string;
    file_size: number;
    mime_type: string;
    media_type: 'image' | 'video';
    alt_text?: string;
    description?: string; // changed from caption
    sort_order: number;
    display_order: number;
    is_featured: boolean;
    url: string;
    thumbnail_url?: string;
}

interface PropertyMediaProps extends PageProps {
    property: Property;
}

export default function PropertyMedia({ property }: PropertyMediaProps) {
    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'inactive': return 'bg-gray-100 text-gray-800';
            case 'maintenance': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AppLayout>
            <Head title={`Media Management - ${property.name}`} />
            
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('admin.properties.show', property.slug)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Property
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Media Management</h1>
                            <p className="text-muted-foreground">
                                Manage photos and videos for: <span className="font-medium">{property.name}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(property.status)}>
                            {property.status.toUpperCase()}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('admin.properties.edit', property.slug)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Property
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Property Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Property Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <label className="font-medium text-muted-foreground">Property Name</label>
                                <p className="mt-1">{property.name}</p>
                            </div>
                            <div>
                                <label className="font-medium text-muted-foreground">Address</label>
                                <p className="mt-1">{property.address}</p>
                            </div>
                            <div>
                                <label className="font-medium text-muted-foreground">Base Rate</label>
                                <p className="mt-1 font-bold">{formatCurrency(property.base_rate)}/night</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Current Media Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Media</p>
                                    <p className="text-2xl font-bold">{property.media.length}</p>
                                </div>
                                <ImageIcon className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Images</p>
                                    <p className="text-2xl font-bold">
                                        {property.media.filter(m => m.media_type === 'image').length}
                                    </p>
                                </div>
                                <ImageIcon className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Videos</p>
                                    <p className="text-2xl font-bold">
                                        {property.media.filter(m => m.media_type === 'video').length}
                                    </p>
                                </div>
                                <Upload className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Featured</p>
                                    <p className="text-2xl font-bold">
                                        {property.media.filter(m => m.is_featured).length}
                                    </p>
                                </div>
                                <Star className="h-8 w-8 text-yellow-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Media Upload Component */}
                <MediaUpload
                    propertySlug={property.slug}
                    initialMedia={property.media} 
                    maxFiles={50}
                    maxFileSize={50 * 1024 * 1024} // 50MB
                    acceptedFileTypes={[
                        'image/jpeg',
                        'image/png', 
                        'image/jpg', 
                        'image/gif',
                        'image/webp',
                        'video/mp4', 
                        'video/mov', 
                        'video/avi',
                        'video/webm'
                    ]}
                />

                {/* Media Management Tips */}
                <Card>
                    <CardHeader>
                        <CardTitle>💡 Media Management Tips</CardTitle>
                        <CardDescription>
                            Best practices for managing your property media
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">📸 Photography Tips</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Upload high-quality images (minimum 1200px width)</li>
                                    <li>• Show all rooms and amenities</li>
                                    <li>• Use natural lighting when possible</li>
                                    <li>• Set one main image as featured</li>
                                    <li>• Add descriptive alt text for accessibility</li>
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm">🎥 Video Guidelines</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li>• Keep videos short (30-60 seconds)</li>
                                    <li>• Use stable recording (tripod recommended)</li>
                                    <li>• Show property walkthrough</li>
                                    <li>• Include outdoor areas and views</li>
                                    <li>• Optimize file size (max 50MB)</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}