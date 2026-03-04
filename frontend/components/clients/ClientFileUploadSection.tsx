'use client';

import { useState, useRef } from 'react';
import { Upload, File, FileText, Image, Trash2, Download, Loader2, ScrollText, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { clientFilesApi, type FileUpload } from '@/lib/api/client-files';
import { formatDistanceToNow } from 'date-fns';

interface ClientFileUploadSectionProps {
  clientId: string;
  files: FileUpload[];
  currentUserId: string;
  onFilesChanged: () => void;
}

const FILE_CATEGORIES = [
  { value: 'contract', label: 'Contract', icon: ScrollText },
  { value: 'meeting_notes', label: 'Meeting Notes', icon: Clipboard },
  { value: 'proposal', label: 'Proposal', icon: FileText },
  { value: 'invoice', label: 'Invoice', icon: File },
  { value: 'other', label: 'Other', icon: File },
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export function ClientFileUploadSection({
  clientId,
  files,
  currentUserId,
  onFilesChanged,
}: ClientFileUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 10MB',
      });
      return;
    }

    setUploading(true);
    try {
      await clientFilesApi.uploadFile(clientId, file, category);
      toast.success('File uploaded successfully');
      onFilesChanged();

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await clientFilesApi.deleteFile(clientId, fileId);
      toast.success('File deleted');
      onFilesChanged();
    } catch (error) {
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDownload = async (file: FileUpload) => {
    try {
      // Get token from cookies
      const cookies = document.cookie.split(';');
      let token = null;
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') {
          token = decodeURIComponent(value);
          break;
        }
      }

      const downloadUrl = clientFilesApi.getDownloadUrl(clientId, file.id);
      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded');
    } catch (error) {
      toast.error('Download failed', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.category]) {
      acc[file.category] = [];
    }
    acc[file.category].push(file);
    return acc;
  }, {} as Record<string, FileUpload[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="gap-2">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="*/*"
          />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>No files uploaded yet</p>
          <p className="text-sm">Upload contracts, meeting notes, proposals, or invoices</p>
        </div>
      ) : (
        <div className="space-y-4">
          {FILE_CATEGORIES.map((cat) => {
            const categoryFiles = groupedFiles[cat.value] || [];
            if (categoryFiles.length === 0) return null;

            const Icon = cat.icon;

            return (
              <div key={cat.value} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">{cat.label}</Label>
                  <Badge variant="secondary" className="text-xs">
                    {categoryFiles.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {categoryFiles.map((file) => {
                    const FileIcon = getFileIcon(file.mimeType);
                    const canDelete = file.uploadedBy.id === currentUserId;

                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {file.originalName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <span>{file.uploadedBy.name}</span>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(file.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
