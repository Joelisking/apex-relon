'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
import { cn } from '@/lib/utils';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export interface MentionTextareaHandle {
  focus: () => void;
}

export const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(
  function MentionTextarea(
    { value, onChange, onKeyDown, placeholder, disabled, className, autoFocus },
    ref,
  ) {
    const taRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStart, setMentionStart] = useState(-1);
    const [selectedIdx, setSelectedIdx] = useState(0);

    useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }));

    const { data: usersData } = useQuery({
      queryKey: ['users-directory'],
      queryFn: () => usersApi.getUsersDirectory(),
      staleTime: 5 * 60_000,
    });

    const users = useMemo(() => usersData?.users ?? [], [usersData]);

    const filtered = useMemo(
      () =>
        mentionQuery !== null
          ? users.filter((u: UserDirectoryItem) =>
              u.name.toLowerCase().includes(mentionQuery.toLowerCase()),
            )
          : [],
      [mentionQuery, users],
    );

    const showDropdown = mentionQuery !== null && filtered.length > 0;

    const detectMention = useCallback(
      (textarea: HTMLTextAreaElement) => {
        const cursor = textarea.selectionStart;
        const textBefore = textarea.value.slice(0, cursor);

        const atIdx = textBefore.lastIndexOf('@');
        if (atIdx === -1) {
          setMentionQuery(null);
          return;
        }

        const beforeAt = atIdx > 0 ? textBefore[atIdx - 1] : ' ';
        if (beforeAt !== ' ' && beforeAt !== '\n' && atIdx !== 0) {
          setMentionQuery(null);
          return;
        }

        const query = textBefore.slice(atIdx + 1);
        if (query.includes('\n') || query.includes(' ') && query.length > 20) {
          setMentionQuery(null);
          return;
        }

        setMentionQuery(query);
        setMentionStart(atIdx);
        setSelectedIdx(0);
      },
      [],
    );

    const insertMention = useCallback(
      (user: UserDirectoryItem) => {
        const before = value.slice(0, mentionStart);
        const ta = taRef.current;
        const cursor = ta?.selectionStart ?? value.length;
        const after = value.slice(cursor);
        const mention = `@[${user.name}](${user.id}) `;
        const newValue = before + mention + after;
        onChange(newValue);
        setMentionQuery(null);

        requestAnimationFrame(() => {
          if (ta) {
            const pos = before.length + mention.length;
            ta.selectionStart = pos;
            ta.selectionEnd = pos;
            ta.focus();
          }
        });
      },
      [value, mentionStart, onChange],
    );

    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        detectMention(e.target);
      },
      [onChange, detectMention],
    );

    const handleKeyDownInternal = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showDropdown) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx((i) => (i + 1) % filtered.length);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length);
            return;
          }
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertMention(filtered[selectedIdx]);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setMentionQuery(null);
            return;
          }
        }
        onKeyDown?.(e);
      },
      [showDropdown, filtered, selectedIdx, insertMention, onKeyDown],
    );

    const handleClick = useCallback(() => {
      if (taRef.current) detectMention(taRef.current);
    }, [detectMention]);

    useEffect(() => {
      if (!showDropdown) return;
      const item = dropdownRef.current?.children[selectedIdx] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }, [selectedIdx, showDropdown]);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          taRef.current &&
          !taRef.current.contains(e.target as Node)
        ) {
          setMentionQuery(null);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="relative">
        <textarea
          ref={taRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDownInternal}
          onClick={handleClick}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        />

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 z-50 mt-1 w-64 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
          >
            {filtered.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
                  idx === selectedIdx
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/50',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                onMouseEnter={() => setSelectedIdx(idx)}
              >
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
