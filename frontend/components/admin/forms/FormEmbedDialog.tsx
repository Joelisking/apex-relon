'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { LeadForm } from '@/lib/types';

interface FormEmbedDialogProps {
  form: LeadForm | null;
  onOpenChange: (open: boolean) => void;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="relative group">
      <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="outline"
        className="absolute top-2 right-2 h-7 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

export function FormEmbedDialog({ form, onOpenChange }: FormEmbedDialogProps) {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-crm.com';

  const iframeCode = form
    ? `<iframe
  src="${origin}/forms/${form.apiKey}"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 8px; border: 1px solid #e5e7eb;"
></iframe>`
    : '';

  const jsCode = form
    ? `<div id="relon-form-${form.apiKey}"></div>
<script
  src="${origin}/forms/embed.js"
  data-key="${form.apiKey}"
  data-container="relon-form-${form.apiKey}"
></script>`
    : '';

  return (
    <Dialog open={!!form} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Embed Form</DialogTitle>
          <DialogDescription>
            Copy one of the snippets below and paste it into your website to
            embed &ldquo;{form?.name}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="iframe" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="iframe" className="flex-1">
              iFrame
            </TabsTrigger>
            <TabsTrigger value="javascript" className="flex-1">
              JavaScript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste this into any HTML page. Works everywhere without JavaScript
              conflicts.
            </p>
            <CodeBlock code={iframeCode} />
          </TabsContent>

          <TabsContent value="javascript" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Use this for a seamless, no-scroll embed that adapts to your
              page&rsquo;s styles.
            </p>
            <CodeBlock code={jsCode} />
            <p className="text-xs text-muted-foreground/60">
              Note: The embed script endpoint is available at{' '}
              <code className="font-mono bg-muted px-1 rounded">
                /forms/embed.js
              </code>
              .
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
