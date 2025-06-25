import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
    Upload, 
    X, 
    CheckCircle, 
    Loader2, 
    Image as ImageIcon,
    Video,
    FileIcon,
    Eye,
    Star,
    Info
} from 'lucide-react';

export interface FileUploadConfig {
    maxFiles?: number;
    maxFileSize?: number; // in bytes
    acceptedFileTypes?: string[];
    acceptedExtensions?: string[];
    showPreview?: boolean;
    allowMultiple?: boolean;
    showProgress?: boolean;
    dragAndDrop?: boolean;
    showFileDetails?: boolean;
    showMetadataForm?: boolean;
    required?: boolean;
}

export interface FileMetadata {
    alt_text?: string;
    description?: string;
    title?: string;
    category?: string;
    is_featured?: boolean;
    is_cover?: boolean;
    sort_order?: number;
}

export interface UploadedFile {
    file: File;
    preview?: string;
    progress?: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
    metadata?: FileMetadata;
    id?: string;
}

interface FileUploadProps {
    config: FileUploadConfig;
    onFilesChange: (files: UploadedFile[]) => void;
    onUpload?: (files: UploadedFile[]) => Promise<void>;
    className?: string;
    label?: string;
    description?: string;
    error?: string;
    initialFiles?: UploadedFile[];
}

export default function FileUpload({
    config,
    onFilesChange,
    onUpload,
    className = '',
    label,
    description,
    error,
    initialFiles = []
}: FileUploadProps) {
    const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        maxFiles = 10,
        maxFileSize = 5 * 1024 * 1024, // 5MB default
        acceptedFileTypes = ['image/*'],
        acceptedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        showPreview = true,
        allowMultiple = true,
        showProgress = true,
        dragAndDrop = true,
        showFileDetails = false,
        showMetadataForm = false,
        required = false
    } = config;

    // Validate file type and size
    const validateFile = useCallback((file: File): string | null => {
        // Check file size
        if (file.size > maxFileSize) {
            return `File size must be less than ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
        }

        // Check file type
        const isValidType = acceptedFileTypes.some(type => {
            if (type.endsWith('/*')) {
                const category = type.split('/')[0];
                return file.type.startsWith(category + '/');
            }
            return file.type === type;
        });

        if (!isValidType) {
            // Check extension as fallback
            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            const isValidExtension = acceptedExtensions.some(ext => 
                ext.toLowerCase() === fileExtension
            );
            
            if (!isValidExtension) {
                return `Invalid file type. Accepted: ${acceptedExtensions.join(', ')}`;
            }
        }

        return null;
    }, [maxFileSize, acceptedFileTypes, acceptedExtensions]);

    // Create file preview
    const createPreview = useCallback((file: File): Promise<string | null> => {
        return new Promise((resolve) => {
            if (!showPreview || !file.type.startsWith('image/')) {
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }, [showPreview]);

    // Process files
    const processFiles = useCallback(async (fileList: FileList | File[]) => {
        const newFiles: UploadedFile[] = [];
        const currentFileCount = files.length;

        // Convert FileList to Array
        const filesArray = Array.from(fileList);

        // Check max files limit
        if (currentFileCount + filesArray.length > maxFiles) {
            alert(`Maximum ${maxFiles} files allowed. You can add ${maxFiles - currentFileCount} more files.`);
            return;
        }

        for (const file of filesArray) {
            const validationError = validateFile(file);
            
            if (validationError) {
                alert(`${file.name}: ${validationError}`);
                continue;
            }

            const preview = await createPreview(file);
            
            newFiles.push({
                file,
                preview: preview || undefined,
                progress: 0,
                status: 'pending',
                metadata: {
                    alt_text: '',
                    description: '',
                    title: file.name.split('.')[0],
                    category: file.type.startsWith('image/') ? 'image' : 'video',
                    is_featured: false,
                    is_cover: false,
                    sort_order: currentFileCount + newFiles.length
                }
            });
        }

        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    }, [files, maxFiles, validateFile, createPreview, onFilesChange]);

    // Handle file input change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList && fileList.length > 0) {
            processFiles(fileList);
        }
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragAndDrop) setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        
        if (!dragAndDrop) return;

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            processFiles(droppedFiles);
        }
    };

    // Remove file
    const removeFile = (index: number) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    // Update file metadata
    const updateFileMetadata = (index: number, metadata: Partial<FileMetadata>) => {
        const updatedFiles = files.map((file, i) => 
            i === index 
                ? { ...file, metadata: { ...file.metadata, ...metadata } }
                : file
        );
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    // Set featured file
    const setFeatured = (index: number) => {
        const updatedFiles = files.map((file, i) => ({
            ...file,
            metadata: {
                ...file.metadata,
                is_featured: i === index,
                is_cover: i === index ? file.metadata?.is_cover : false
            }
        }));
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    // Handle upload
    const handleUpload = async () => {
        if (!onUpload || files.length === 0) return;

        setIsUploading(true);
        
        // Update all files to uploading status
        const uploadingFiles = files.map(file => ({
            ...file,
            status: 'uploading' as const,
            progress: 0
        }));
        setFiles(uploadingFiles);

        try {
            await onUpload(uploadingFiles);
            
            // Mark all as completed
            const completedFiles = files.map(file => ({
                ...file,
                status: 'completed' as const,
                progress: 100
            }));
            setFiles(completedFiles);
            onFilesChange(completedFiles);
        } catch (error) {
            // Mark as error
            const errorFiles = files.map(file => ({
                ...file,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed'
            }));
            setFiles(errorFiles);
            onFilesChange(errorFiles);
        } finally {
            setIsUploading(false);
        }
    };

    // Get file icon
    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
        if (file.type.startsWith('video/')) return <Video className="w-5 h-5" />;
        return <FileIcon className="w-5 h-5" />;
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Label and Description */}
            {label && (
                <div>
                    <Label className="text-base font-medium">
                        {label} {required && <span className="text-red-500">*</span>}
                    </Label>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    )}
                </div>
            )}

            {/* Upload Area */}
            <div
                className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
                    isDragActive
                        ? 'border-blue-500 bg-blue-50'
                        : files.length > 0
                        ? 'border-green-500 bg-green-50'
                        : error
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={acceptedFileTypes.join(',')}
                    multiple={allowMultiple}
                    onChange={handleFileChange}
                />

                {files.length === 0 ? (
                    <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-32 cursor-pointer p-6"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="flex flex-col items-center justify-center">
                            <Upload className={`w-8 h-8 mb-2 transition-colors ${
                                isDragActive ? 'text-blue-500' : 'text-gray-400'
                            }`} />
                            <p className="mb-1 text-sm text-gray-600">
                                <span className="font-semibold">Click to upload</span>
                                {dragAndDrop && ' or drag and drop'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {acceptedExtensions.join(', ').toUpperCase()} 
                                {maxFileSize && ` (Max ${(maxFileSize / 1024 / 1024).toFixed(0)}MB each)`}
                            </p>
                            {maxFiles > 1 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Maximum {maxFiles} files
                                </p>
                            )}
                        </div>
                    </label>
                ) : (
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-sm font-medium">
                                    {files.length} file{files.length > 1 ? 's' : ''} selected
                                </span>
                                {maxFiles > files.length && (
                                    <Badge variant="outline" className="text-xs">
                                        {maxFiles - files.length} more allowed
                                    </Badge>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Add More
                            </Button>
                        </div>

                        {/* File List */}
                        <div className="space-y-3">
                            {files.map((uploadedFile, index) => (
                                <div key={index} className="border rounded-lg p-3 bg-white">
                                    <div className="flex items-start gap-3">
                                        {/* Preview/Icon */}
                                        <div className="flex-shrink-0">
                                            {uploadedFile.preview ? (
                                                <div className="relative group">
                                                    <img
                                                        src={uploadedFile.preview}
                                                        alt={uploadedFile.file.name}
                                                        className="w-16 h-16 object-cover rounded border"
                                                    />
                                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                                                        <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 border rounded flex items-center justify-center bg-gray-100">
                                                    {getFileIcon(uploadedFile.file)}
                                                </div>
                                            )}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {uploadedFile.file.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                        <span>{formatFileSize(uploadedFile.file.size)}</span>
                                                        <span>•</span>
                                                        <span>{uploadedFile.file.type}</span>
                                                        {uploadedFile.metadata?.is_featured && (
                                                            <>
                                                                <span>•</span>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <Star className="w-3 h-3 mr-1" />
                                                                    Featured
                                                                </Badge>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 ml-2">
                                                    {showMetadataForm && uploadedFile.file.type.startsWith('image/') && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setFeatured(index)}
                                                            className={uploadedFile.metadata?.is_featured ? 'text-yellow-600' : ''}
                                                        >
                                                            <Star className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeFile(index)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            {showProgress && uploadedFile.status === 'uploading' && (
                                                <div className="mt-2">
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Uploading... {uploadedFile.progress || 0}%
                                                    </div>
                                                    <Progress value={uploadedFile.progress || 0} className="h-1" />
                                                </div>
                                            )}

                                            {/* Status */}
                                            {uploadedFile.status === 'completed' && (
                                                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Upload complete
                                                </div>
                                            )}

                                            {uploadedFile.status === 'error' && (
                                                <div className="mt-2 text-xs text-red-600">
                                                    Error: {uploadedFile.error}
                                                </div>
                                            )}

                                            {/* Metadata Form */}
                                            {showMetadataForm && (
                                                <div className="mt-3 pt-3 border-t space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div>
                                                            <Label className="text-xs">Alt Text</Label>
                                                            <Input
                                                                size={1}
                                                                value={uploadedFile.metadata?.alt_text || ''}
                                                                onChange={(e) => updateFileMetadata(index, { alt_text: e.target.value })}
                                                                placeholder="Describe the image..."
                                                                className="text-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Title</Label>
                                                            <Input
                                                                size={1}
                                                                value={uploadedFile.metadata?.title || ''}
                                                                onChange={(e) => updateFileMetadata(index, { title: e.target.value })}
                                                                placeholder="Image title..."
                                                                className="text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Description</Label>
                                                        <Textarea
                                                            rows={2}
                                                            value={uploadedFile.metadata?.description || ''}
                                                            onChange={(e) => updateFileMetadata(index, { description: e.target.value })}
                                                            placeholder="Detailed description..."
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    {error}
                </p>
            )}

            {/* Upload Button */}
            {onUpload && files.length > 0 && !files.every(f => f.status === 'completed') && (
                <Button
                    onClick={handleUpload}
                    disabled={isUploading || files.length === 0}
                    className="w-full"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading {files.length} file{files.length > 1 ? 's' : ''}...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload {files.length} file{files.length > 1 ? 's' : ''}
                        </>
                    )}
                </Button>
            )}
        </div>
    );
} 
