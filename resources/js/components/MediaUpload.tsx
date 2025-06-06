import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { 
    Upload, 
    X, 
    Image, 
    Video, 
    Star, 
    Edit, 
    Trash2, 
    Eye,
    Move,
    Download,
    RotateCcw,
    Maximize2,
    AlertCircle,
    CheckCircle2,
    ImageIcon,
    Edit2,
    GripVertical
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';

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

interface MediaUploadProps {
    propertySlug: string;
    initialMedia?: MediaItem[];
    maxFiles?: number;
    maxFileSize?: number; // in bytes
    acceptedFileTypes?: string[];
    onMediaChange?: (media: MediaItem[]) => void;
}

export default function MediaUpload({ 
    propertySlug, 
    initialMedia = [], 
    maxFiles = 20,
    maxFileSize = 20 * 1024 * 1024, // 20MB
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'video/mp4', 'video/mov', 'video/avi'],
    onMediaChange
}: MediaUploadProps) {
    const [media, setMedia] = useState<MediaItem[]>(initialMedia);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [draggedItem, setDraggedItem] = useState<MediaItem | null>(null);
    const [editForm, setEditForm] = useState({
        alt_text: '',
        description: '',
        is_featured: false,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (uploading || acceptedFiles.length === 0) return;
        if (media.length + acceptedFiles.length > maxFiles) {
            alert(`You can only upload a maximum of ${maxFiles} files.`);
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        acceptedFiles.forEach((file, index) => {
            formData.append(`files[${index}]`, file);
        });
        formData.append('type', acceptedFiles[0].type.startsWith('video/') ? 'video' : 'image');

        // Use native fetch for file upload to ensure proper FormData handling
        fetch(route('admin.media.upload', propertySlug), {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(async (response) => {
            if (response.ok) {
                // Success - refresh the page to show new media
                window.location.reload();
            } else {
                const errorData = await response.text();
                console.error('Upload error:', errorData);
                alert('Upload failed. Please try again.');
            }
        })
        .catch((error) => {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        })
        .finally(() => {
            setUploading(false);
            setUploadProgress(0);
        });
    }, [media, maxFiles, propertySlug, onMediaChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
        maxSize: maxFileSize,
        disabled: uploading,
    });

    const handleEditMedia = (mediaItem: MediaItem) => {
        setSelectedMedia(mediaItem);
        setEditForm({
            alt_text: mediaItem.alt_text || '',
            description: mediaItem.description || '',
            is_featured: mediaItem.is_featured,
        });
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedMedia) return;

        try {
            const response = await fetch(`/admin/media/${selectedMedia.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(editForm),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const updatedMedia = media.map(item =>
                        item.id === selectedMedia.id ? { ...item, ...editForm } : item
                    );
                    setMedia(updatedMedia);
                    onMediaChange?.(updatedMedia);
                    setShowEditDialog(false);
                }
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Update failed. Please try again.');
        }
    };

    const handleDeleteMedia = async (mediaItem: MediaItem) => {
        if (!confirm(`Are you sure you want to delete "${mediaItem.file_name}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/admin/media/${mediaItem.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const updatedMedia = media.filter(item => item.id !== mediaItem.id);
                setMedia(updatedMedia);
                onMediaChange?.(updatedMedia);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed. Please try again.');
        }
    };

    const handleSetFeatured = async (mediaItem: MediaItem) => {
        try {
            const response = await fetch(`/admin/media/${mediaItem.id}/featured`, {
                method: 'PATCH',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const updatedMedia = media.map(item => ({
                    ...item,
                    is_featured: item.id === mediaItem.id
                }));
                setMedia(updatedMedia);
                onMediaChange?.(updatedMedia);
            }
        } catch (error) {
            console.error('Set featured error:', error);
            alert('Failed to set featured image. Please try again.');
        }
    };

    const handleDragStart = (e: React.DragEvent, mediaItem: MediaItem) => {
        setDraggedItem(mediaItem);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetItem: MediaItem) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.id === targetItem.id) return;

        const newMedia = [...media];
        const draggedIndex = newMedia.findIndex(item => item.id === draggedItem.id);
        const targetIndex = newMedia.findIndex(item => item.id === targetItem.id);

        // Reorder array
        newMedia.splice(draggedIndex, 1);
        newMedia.splice(targetIndex, 0, draggedItem);

        // Update sort orders
        newMedia.forEach((item, index) => {
            item.sort_order = index + 1;
            item.display_order = index + 1;
        });

        setMedia(newMedia);
        setDraggedItem(null);

        // Save order to server
        try {
            await fetch(`/admin/properties/${propertySlug}/media/reorder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    media_ids: newMedia.map(item => item.id)
                }),
            });
        } catch (error) {
            console.error('Reorder error:', error);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getMediaIcon = (mediaType: string) => {
        return mediaType === 'video' ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />;
    };

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Media
                    </CardTitle>
                    <CardDescription>
                        Upload images and videos for your property. Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            isDragActive 
                                ? 'border-blue-500 bg-blue-50' 
                                : uploading 
                                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                                : 'border-gray-300 hover:border-gray-400'
                        }`}
                    >
                        <input {...getInputProps()} ref={fileInputRef} />
                        
                        {uploading ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-blue-500 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Uploading files...</p>
                                    <Progress value={uploadProgress} className="mt-2" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">
                                        {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Supports: JPG, PNG, GIF, MP4, MOV, AVI
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {media.length > 0 && (
                        <div className="mt-4 text-sm text-muted-foreground">
                            {media.length} of {maxFiles} files uploaded
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Media Gallery */}
            {media.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Media Gallery
                        </CardTitle>
                        <CardDescription>
                            Drag and drop to reorder. Click to edit details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {media
                                .sort((a, b) => (a.display_order || a.sort_order) - (b.display_order || b.sort_order))
                                .map((mediaItem) => (
                                <div
                                    key={mediaItem.id}
                                    className="relative group border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, mediaItem)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, mediaItem)}
                                >
                                    {/* Media Preview */}
                                    <div className="aspect-square relative">
                                        {mediaItem.media_type === 'image' ? (
                                            <img
                                                src={mediaItem.thumbnail_url || mediaItem.url}
                                                alt={mediaItem.alt_text || mediaItem.file_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <Video className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                        
                                        {/* Featured Badge */}
                                        {mediaItem.is_featured && (
                                            <div className="absolute top-2 left-2">
                                                <Badge variant="default" className="bg-yellow-500">
                                                    <Star className="h-3 w-3 mr-1" />
                                                    Featured
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Media Type Badge */}
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {getMediaIcon(mediaItem.media_type)}
                                            </Badge>
                                        </div>

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setSelectedMedia(mediaItem);
                                                        setShowPreviewDialog(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleEditMedia(mediaItem)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteMedia(mediaItem)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media Info */}
                                    <div className="p-3">
                                        <p className="text-sm font-medium truncate" title={mediaItem.file_name}>
                                            {mediaItem.file_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatFileSize(mediaItem.file_size)}
                                        </p>
                                                                        {mediaItem.description && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate" title={mediaItem.description}>
                                        {mediaItem.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex gap-1">
                                            {!mediaItem.is_featured && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSetFeatured(mediaItem)}
                                                    className="h-6 px-2"
                                                >
                                                    <Star className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 px-2 cursor-move"
                                            >
                                                <Move className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edit Media Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Media Details</DialogTitle>
                        <DialogDescription>
                            Update information for {selectedMedia?.file_name}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="alt_text">Alt Text</Label>
                            <Input
                                id="alt_text"
                                placeholder="Describe this image..."
                                value={editForm.alt_text}
                                onChange={(e) => setEditForm(prev => ({ ...prev, alt_text: e.target.value }))}
                            />
                        </div>
                        
                        <div>
                                                                <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Add a description..."
                                        value={editForm.description}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_featured"
                                checked={editForm.is_featured}
                                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_featured: checked }))}
                            />
                            <Label htmlFor="is_featured">Set as featured image</Label>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedMedia?.file_name}</DialogTitle>
                    </DialogHeader>
                    
                    {selectedMedia && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                {selectedMedia.media_type === 'image' ? (
                                    <img
                                        src={selectedMedia.url}
                                        alt={selectedMedia.alt_text || selectedMedia.file_name}
                                        className="max-w-full max-h-96 object-contain"
                                    />
                                ) : (
                                    <video
                                        src={selectedMedia.url}
                                        controls
                                        className="max-w-full max-h-96"
                                    />
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <strong>File Size:</strong> {formatFileSize(selectedMedia.file_size)}
                                </div>
                                <div>
                                    <strong>Type:</strong> {selectedMedia.mime_type}
                                </div>
                                {selectedMedia.alt_text && (
                                    <div className="col-span-2">
                                        <strong>Alt Text:</strong> {selectedMedia.alt_text}
                                    </div>
                                )}
                                {selectedMedia.description && (
                                    <div className="col-span-2">
                                        <strong>Description:</strong> {selectedMedia.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                            Close
                        </Button>
                        <Button asChild>
                            <a href={selectedMedia?.url} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 