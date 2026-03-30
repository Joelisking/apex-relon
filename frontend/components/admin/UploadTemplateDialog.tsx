'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { proposalTemplatesApi, ProposalTemplate } from '@/lib/api/proposal-templates-client';
import type { ServiceType } from '@/lib/types';

interface UploadTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTypes: ServiceType[];
  onUploaded: (template: ProposalTemplate) => void;
}

export default function UploadTemplateDialog({
  open,
  onOpenChange,
  serviceTypes,
  onUploaded,
}: UploadTemplateDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      toast.error('Only .docx files are supported');
      return;
    }
    setSelectedFile(file);
    if (!name) setName(file.name.replace(/\.docx$/i, ''));
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setServiceTypeId('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select a .docx file');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    setUploading(true);
    try {
      const template = await proposalTemplatesApi.upload(
        selectedFile,
        name.trim(),
        description.trim() || undefined,
        serviceTypeId || undefined,
      );
      toast.success(`Template "${template.name}" uploaded`);
      onUploaded(template);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Proposal Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File picker */}
          <div>
            <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold block mb-1.5">
              Template File (.docx)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm text-foreground truncate min-w-0">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-5 text-center hover:bg-muted/30 hover:border-border transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select a <span className="font-medium text-foreground">.docx</span> file
                </span>
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold block mb-1.5">
              Template Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Boundary Survey Proposal"
              className="text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold block mb-1.5">
              Description{' '}
              <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template"
              className="text-sm"
            />
          </div>

          {/* Service Type */}
          <div>
            <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold block mb-1.5">
              Service Type{' '}
              <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Select value={serviceTypeId || 'none'} onValueChange={(v) => setServiceTypeId(v === 'none' ? '' : v)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="All service types" />
              </SelectTrigger>
              <SelectContent className="max-h-56 overflow-y-auto">
                <SelectItem value="none">All service types</SelectItem>
                {serviceTypes.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={uploading || !selectedFile} className="gap-1.5">
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
