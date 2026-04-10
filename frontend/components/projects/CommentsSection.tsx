'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Send, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { commentsApi, type ProjectComment } from '@/lib/api/comments-client';

function avatarInitials(name: string) {
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── CommentBubble ────────────────────────────────────────────────────────────

interface CommentBubbleProps {
  comment: ProjectComment;
  currentUserId: string;
  onDelete: (id: string) => void;
  onEdit: (comment: ProjectComment) => void;
}

function CommentBubble({ comment, currentUserId, onDelete, onEdit }: CommentBubbleProps) {
  const isOwn = comment.authorId === currentUserId;
  const color = avatarColor(comment.authorId);
  const initials = avatarInitials(comment.author.name);

  return (
    <div className="flex gap-3 group">
      <div className={`h-8 w-8 rounded-full ${color} shrink-0 flex items-center justify-center text-white text-xs font-semibold`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{comment.author.name}</span>
          <span
            className="text-xs text-muted-foreground"
            title={format(new Date(comment.createdAt), 'PPpp')}
          >
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-xs text-muted-foreground/60">(edited)</span>
          )}
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </div>
        {isOwn && (
          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => onEdit(comment)}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CommentsSection (exported) ───────────────────────────────────────────────

interface CommentsSectionProps {
  projectId: string;
  currentUserId: string;
}

export function CommentsSection({ projectId, currentUserId }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [editingComment, setEditingComment] = useState<ProjectComment | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', projectId],
    queryFn: () => commentsApi.getAll(projectId),
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
  }, [queryClient, projectId]);

  const createMutation = useMutation({
    mutationFn: (content: string) => commentsApi.create(projectId, { content }),
    onSuccess: () => { setText(''); invalidate(); },
    onError: () => toast.error('Failed to post comment'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentsApi.update(id, content),
    onSuccess: () => { setEditingComment(null); setEditText(''); invalidate(); },
    onError: () => toast.error('Failed to update comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => commentsApi.delete(id),
    onSuccess: () => { toast.success('Comment deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete comment'),
  });

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }, [text, createMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const startEdit = useCallback((comment: ProjectComment) => {
    setEditingComment(comment);
    setEditText(comment.content);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingComment || !editText.trim()) return;
    editMutation.mutate({ id: editingComment.id, content: editText.trim() });
  }, [editingComment, editText, editMutation]);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5" />
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 py-4 text-center">
          No comments yet — be the first to comment
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) =>
            editingComment?.id === comment.id ? (
              <div key={comment.id} className="flex gap-3">
                <div className={`h-8 w-8 rounded-full ${avatarColor(comment.authorId)} shrink-0 flex items-center justify-center text-white text-xs font-semibold`}>
                  {avatarInitials(comment.author.name)}
                </div>
                <div className="flex-1 space-y-2">
                  <Textarea
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="resize-none text-sm min-h-[80px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit();
                      if (e.key === 'Escape') { setEditingComment(null); setEditText(''); }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={editMutation.isPending}>
                      {editMutation.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => { setEditingComment(null); setEditText(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <CommentBubble
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={(id) => deleteMutation.mutate(id)}
                onEdit={startEdit}
              />
            )
          )}
        </div>
      )}

      {/* Compose box */}
      <div className="flex gap-3 pt-2 border-t border-border/40">
        <div className={`h-8 w-8 rounded-full ${avatarColor(currentUserId)} shrink-0 flex items-center justify-center text-white text-xs font-semibold`}>
          me
        </div>
        <div className="flex-1 space-y-2">
          <Textarea
            ref={textareaRef}
            placeholder="Add a comment… (⌘↵ to submit)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none text-sm min-h-[72px]"
            disabled={createMutation.isPending}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleSubmit}
              disabled={createMutation.isPending || !text.trim()}
            >
              <Send className="h-3.5 w-3.5" />
              {createMutation.isPending ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
