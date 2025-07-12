import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { 
    Upload, 
    Star, 
    Trash2, 
    Move, 
    Edit, 
    Image as ImageIcon,
    Video,
    AlertCircle,
    CheckCircle,
    Info,
    Save,
    Eye
} from 'lucide-react';
import FileUpload, { UploadedFile, FileUploadConfig, FileMetadata } from '@/components/ui/file-upload';

interface MediaItem {
    id: number;
    file_name: string;
    file_path: string;
    thumbnail_path?: string;
    file_size: number;
    mime_type: string;
    media_type: 'image' | 'video';
    alt_text?: string;
    description?: string;
    title?: string;
    category?: string;
    sort_order: number;
    display_order: number;
    is_featured: boolean;
    is_cover: boolean;
    url: string;
    thumbnail_url?: string;
}

interface MediaUploadProps {
    propertySlug: string;
    initialMedia: MediaItem[];
    maxFiles?: number;
    maxFileSize?: number;
    acceptedFileTypes?: string[];
}

export default function MediaUpload({
    propertySlug,
    initialMedia,
    maxFiles = 50,
    maxFileSize = 100 * 1024 * 1024, // 100MB (konsisten dengan PHP config)
    acceptedFileTypes = [
        'image/jpeg',
        'image/png', 
        'image/jpg', 
        'image/gif',
        'image/webp',
        'video/mp4', 
        'video/mov', 
        'video/avi',
        'video/webm'
    ]
}: MediaUploadProps) {
    const [media, setMedia] = useState<MediaItem[]>(initialMedia);
    const [isUploading, setIsUploading] = useState(false);
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [editingMedia, setEditingMedia] = useState<{[key: number]: boolean}>({});

    // Category options sesuai dengan enum database
    const categoryOptions = [
        { value: 'exterior', label: 'Exterior' },
        { value: 'living_room', label: 'Living Room' },
        { value: 'bedroom', label: 'Bedroom' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'bathroom', label: 'Bathroom' },
        { value: 'amenities', label: 'Amenities' },
        { value: 'tour', label: 'Virtual Tour' },
    ];

    // FileUpload configuration for media
    const uploadConfig: FileUploadConfig = {
        maxFiles,
        maxFileSize,
        acceptedFileTypes,
        acceptedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm'],
        showPreview: true,
        allowMultiple: true,
        showProgress: true,
        dragAndDrop: true,
        showFileDetails: true,
        showMetadataForm: true,
        required: false
    };

    // Show notification
    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    // Refresh CSRF token
    const refreshCsrfToken = async () => {
        try {
            const response = await fetch('/csrf-token', {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                // Update the meta tag
                const metaTag = document.querySelector('meta[name="csrf-token"]');
                if (metaTag) {
                    metaTag.setAttribute('content', data.token);
                }
                return data.token;
            }
        } catch (error) {
            console.error('Failed to refresh CSRF token:', error);
        }
        return null;
    };

    // Handle file upload
    const handleUpload = async (files: UploadedFile[]) => {
        setIsUploading(true);
        
        try {
            const formData = new FormData();
            
            // Add files to FormData - sesuai dengan MediaController expectation
            files.forEach((uploadedFile, index) => {
                formData.append(`files[]`, uploadedFile.file);
            });

            // Get CSRF token with better error handling
            let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            // If no CSRF token found, try to refresh it
            if (!csrfToken) {
                console.log('CSRF token not found, attempting to refresh...');
                try {
                    const response = await fetch('/csrf-token', {
                        method: 'GET',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        csrfToken = data.token;
                        // Update the meta tag
                        const metaTag = document.querySelector('meta[name="csrf-token"]');
                        if (metaTag) {
                            metaTag.setAttribute('content', data.token);
                        }
                    }
                } catch (error) {
                    console.error('Failed to refresh CSRF token:', error);
                }
            }

            if (!csrfToken) {
                throw new Error('CSRF token not found. Please refresh the page and try again.');
            }

            console.log('Uploading to:', `/admin/properties/${propertySlug}/media/upload`);
            console.log('CSRF Token:', csrfToken ? 'Found' : 'Missing');

            // Upload files via MediaController
            const response = await fetch(`/admin/properties/${propertySlug}/media/upload`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showNotification('success', `${files.length} file(s) uploaded successfully!`);
                
                // Refresh media list
                router.reload({
                    only: ['property'],
                    onSuccess: (page: any) => {
                        if (page.props.property?.media) {
                            setMedia(page.props.property.media);
                        }
                    }
                });
            } else {
                // Handle validation errors
                if (response.status === 422 && result.errors) {
                    const errorMessages: string[] = [];
                    Object.keys(result.errors).forEach(key => {
                        if (Array.isArray(result.errors[key])) {
                            errorMessages.push(...result.errors[key]);
                        } else {
                            errorMessages.push(result.errors[key]);
                        }
                    });
                    throw new Error(errorMessages.join(', '));
                }
                
                // Handle CSRF token mismatch specifically
                if (response.status === 419) {
                    throw new Error('CSRF token mismatch. Please refresh the page and try again.');
                }
                
                // Handle other errors
                throw new Error(result.message || `Upload failed with status ${response.status}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Upload failed';
            if (error instanceof Error) {
                if (error.message.includes('CSRF token mismatch') || error.message.includes('419')) {
                    errorMessage = 'CSRF token mismatch. Please refresh the page and try again.';
                } else if (error.message.includes('413')) {
                    errorMessage = 'File too large. Maximum file size is 100MB.';
                } else if (error.message.includes('422')) {
                    errorMessage = error.message;
                } else if (error.message.includes('500')) {
                    errorMessage = 'Server error. Please try again later.';
                } else {
                    errorMessage = error.message;
                }
            }
            
            showNotification('error', errorMessage);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    // Update media metadata - sesuai dengan PropertyMedia model fields
    const updateMedia = async (mediaId: number, metadata: Partial<MediaItem>) => {
        try {
            const response = await fetch(`/admin/media/${mediaId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    alt_text: metadata.alt_text,
                    description: metadata.description,
                    title: metadata.title,
                    category: metadata.category,
                    is_featured: metadata.is_featured || false,
                    display_order: metadata.display_order
                }),
            });

            const result = await response.json();

            if (result.success) {
                showNotification('success', 'Media updated successfully!');
                
                // Update local state
                setMedia(prevMedia => 
                    prevMedia.map(item => 
                        item.id === mediaId 
                            ? { ...item, ...metadata }
                            : item
                    )
                );
                
                // Stop editing mode
                setEditingMedia(prev => ({ ...prev, [mediaId]: false }));
            } else {
                throw new Error(result.message || 'Update failed');
            }
        } catch (error) {
            console.error('Update error:', error);
            showNotification('error', error instanceof Error ? error.message : 'Update failed');
        }
    };

    // Set featured media
    const setFeatured = async (mediaId: number) => {
        try {
            const response = await fetch(`/admin/media/${mediaId}/featured`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const result = await response.json();

            if (result.success) {
                showNotification('success', 'Featured image updated!');
                
                // Update local state
                setMedia(prevMedia => 
                    prevMedia.map(item => ({
                        ...item,
                        is_featured: item.id === mediaId
                    }))
                );
            } else {
                throw new Error(result.message || 'Failed to set featured');
            }
        } catch (error) {
            console.error('Set featured error:', error);
            showNotification('error', error instanceof Error ? error.message : 'Failed to set featured');
        }
    };

    // Delete media
    const deleteMedia = async (mediaId: number) => {
        if (!confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/admin/media/${mediaId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const result = await response.json();

            if (result.success) {
                showNotification('success', 'Media deleted successfully!');
                
                // Remove from local state
                setMedia(prevMedia => prevMedia.filter(item => item.id !== mediaId));
            } else {
                throw new Error(result.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification('error', error instanceof Error ? error.message : 'Delete failed');
        }
    };

    // Reorder media
    const reorderMedia = async (mediaIds: number[]) => {
        try {
            const response = await fetch(`/admin/properties/${propertySlug}/media/reorder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ media_ids: mediaIds }),
            });

            const result = await response.json();

            if (result.success) {
                showNotification('success', 'Media reordered successfully!');
            } else {
                throw new Error(result.message || 'Reorder failed');
            }
        } catch (error) {
            console.error('Reorder error:', error);
            showNotification('error', error instanceof Error ? error.message : 'Reorder failed');
        }
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Get media type icon
    const getMediaIcon = (mediaType: string) => {
        return mediaType === 'image' ? <ImageIcon className="w-5 h-5" /> : <Video className="w-5 h-5" />;
    };

    // Toggle edit mode
    const toggleEditMode = (mediaId: number) => {
        setEditingMedia(prev => ({
            ...prev,
            [mediaId]: !prev[mediaId]
        }));
    };

    // Handle metadata update
    const handleMetadataUpdate = (mediaId: number, field: keyof MediaItem, value: any) => {
        setMedia(prevMedia => 
            prevMedia.map(item => 
                item.id === mediaId 
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    return (
        <div className="space-y-6">
            {/* Notifications */}
            {notification && (
                <Alert className={notification.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
                    {notification.type === 'error' ? (
                        <AlertCircle className="h-4 w-4" />
                    ) : (
                        <CheckCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {/* File Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload New Media
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <FileUpload
                        config={uploadConfig}
                        onFilesChange={() => {}} // We handle files in onUpload
                        onUpload={handleUpload}
                        label="Property Media Files"
                        description="Upload high-quality images and videos to showcase your property. Supported formats: JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM"
                    />
                </CardContent>
            </Card>

            {/* Existing Media Management */}
            {media.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Existing Media ({media.length})</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    Images: {media.filter(m => m.media_type === 'image').length}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    Videos: {media.filter(m => m.media_type === 'video').length}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    Featured: {media.filter(m => m.is_featured).length}
                                </Badge>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {media
                                .sort((a, b) => a.display_order - b.display_order)
                                .map((item) => (
                                <div key={item.id} className="border rounded-lg p-3 bg-white shadow-sm">
                                    {/* Media Preview */}
                                    <div className="aspect-video bg-gray-100 rounded mb-3 overflow-hidden relative group">
                                        {item.media_type === 'image' ? (
                                            <img
                                                src={item.thumbnail_url || item.url}
                                                alt={item.alt_text || item.file_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                <Video className="w-8 h-8 text-gray-400" />
                                                <span className="ml-2 text-sm text-gray-600">Video</span>
                                            </div>
                                        )}
                                        
                                        {/* Overlay buttons */}
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => window.open(item.url, '_blank')}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setFeatured(item.id)}
                                                    className={item.is_featured ? 'bg-yellow-500 text-white' : ''}
                                                >
                                                    <Star className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => toggleEditMode(item.id)}
                                                    className={editingMedia[item.id] ? 'bg-blue-500 text-white' : ''}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => deleteMedia(item.id)}
                                                    className="bg-red-500 text-white hover:bg-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* Featured badge */}
                                        {item.is_featured && (
                                            <div className="absolute top-2 right-2">
                                                <Badge className="bg-yellow-500 text-white">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    Featured
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Media Info */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium truncate">{item.file_name}</span>
                                            <div className="flex items-center gap-1 text-gray-500">
                                                {getMediaIcon(item.media_type)}
                                                <span>{formatFileSize(item.file_size)}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Metadata Form - sesuai dengan PropertyMedia model */}
                                        {editingMedia[item.id] ? (
                                            <div className="space-y-3 p-3 bg-gray-50 rounded border">
                                                {/* Title */}
                                                <div>
                                                    <Label className="text-xs text-gray-600">Title</Label>
                                                    <Input
                                                        size={1}
                                                        value={item.title || ''}
                                                        onChange={(e) => handleMetadataUpdate(item.id, 'title', e.target.value)}
                                                        placeholder="Media title..."
                                                        className="text-xs mt-1"
                                                    />
                                                </div>
                                                
                                                {/* Alt Text */}
                                                <div>
                                                    <Label className="text-xs text-gray-600">Alt Text</Label>
                                                    <Input
                                                        size={1}
                                                        value={item.alt_text || ''}
                                                        onChange={(e) => handleMetadataUpdate(item.id, 'alt_text', e.target.value)}
                                                        placeholder="Describe this image for accessibility..."
                                                        className="text-xs mt-1"
                                                    />
                                                </div>
                                                
                                                {/* Description */}
                                                <div>
                                                    <Label className="text-xs text-gray-600">Description</Label>
                                                    <Textarea
                                                        rows={2}
                                                        value={item.description || ''}
                                                        onChange={(e) => handleMetadataUpdate(item.id, 'description', e.target.value)}
                                                        placeholder="Detailed description..."
                                                        className="text-xs mt-1"
                                                    />
                                                </div>
                                                
                                                {/* Category */}
                                                <div>
                                                    <Label className="text-xs text-gray-600">Category</Label>
                                                    <Select
                                                        value={item.category || 'exterior'}
                                                        onValueChange={(value) => handleMetadataUpdate(item.id, 'category', value)}
                                                    >
                                                        <SelectTrigger className="text-xs mt-1 h-8">
                                                            <SelectValue placeholder="Select category..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categoryOptions.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                
                                                {/* Display Order */}
                                                <div>
                                                    <Label className="text-xs text-gray-600">Display Order</Label>
                                                    <Input
                                                        type="number"
                                                        size={1}
                                                        value={item.display_order}
                                                        onChange={(e) => handleMetadataUpdate(item.id, 'display_order', parseInt(e.target.value) || 0)}
                                                        className="text-xs mt-1"
                                                    />
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateMedia(item.id, item)}
                                                        className="flex-1"
                                                    >
                                                        <Save className="w-3 h-3 mr-1" />
                                                        Save
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleEditMode(item.id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <div className="space-y-2 text-xs text-gray-600">
                                                {item.title && (
                                                    <div>
                                                        <span className="font-medium">Title:</span> {item.title}
                                                    </div>
                                                )}
                                                {item.alt_text && (
                                                    <div>
                                                        <span className="font-medium">Alt:</span> {item.alt_text}
                                                    </div>
                                                )}
                                                {item.description && (
                                                    <div>
                                                        <span className="font-medium">Description:</span> {item.description}
                                                    </div>
                                                )}
                                                {item.category && (
                                                    <div>
                                                        <span className="font-medium">Category:</span> {categoryOptions.find(opt => opt.value === item.category)?.label || item.category}
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="font-medium">Order:</span> {item.display_order}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Bulk Actions */}
                        <div className="mt-6 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    {media.length} media files • {media.filter(m => m.is_featured).length} featured
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.get(`/admin/properties/${propertySlug}/media/optimize`)}
                                    >
                                        Optimize Images
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.get(`/admin/properties/${propertySlug}/media/thumbnails`)}
                                    >
                                        Generate Thumbnails
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tips */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                        <Info className="h-4 w-4" />
                        Media Management Tips
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-700 space-y-2">
                    <p>• <strong>Featured Image:</strong> Set one main image that will be used as the property cover</p>
                    <p>• <strong>Alt Text:</strong> Add descriptive text for better accessibility and SEO</p>
                    <p>• <strong>Title:</strong> Give each media file a descriptive title</p>
                    <p>• <strong>Category:</strong> Organize media by room or area (bedroom, kitchen, exterior, etc.)</p>
                    <p>• <strong>Display Order:</strong> Control the order in which media appears to guests</p>
                    <p>• <strong>Description:</strong> Add detailed descriptions for better context</p>
                    <p>• <strong>File Size:</strong> Keep images under 5MB and videos under 50MB for better performance</p>
                    <p>• <strong>Quality:</strong> Use high-resolution images (minimum 1200px width) for best results</p>
                </CardContent>
            </Card>
        </div>
    );
} 