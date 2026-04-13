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

// ─── Mention format helpers ─────────────────────────────────────────────────

/** Convert raw storage format `@[Name](uuid)` → display `@Name` */
function rawToDisplay(raw: string): string {
  return raw.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

/** Convert display format back to raw using registry. Longest name first to avoid partial matches. */
function displayToRaw(display: string, registry: Map<string, string>): string {
  const entries = [...registry.entries()].sort((a, b) => b[0].length - a[0].length);
  let result = display;
  for (const [name, id] of entries) {
    result = result.split(`@${name}`).join(`@[${name}](${id})`);
  }
  return result;
}

/** Build a name→id registry by parsing all mentions in a raw string. */
function buildRegistryFromRaw(raw: string): Map<string, string> {
  const registry = new Map<string, string>();
  const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    registry.set(m[1], m[2]);
  }
  return registry;
}

// ────────────────────────────────────────────────────────────────────────────

export const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(
  function MentionTextarea(
    { value, onChange, onKeyDown, placeholder, disabled, className, autoFocus },
    ref,
  ) {
    const taRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mentionRegistry = useRef<Map<string, string>>(new Map());
    const [displayValue, setDisplayValue] = useState(() => rawToDisplay(value ?? ''));
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStart, setMentionStart] = useState(-1);
    const [selectedIdx, setSelectedIdx] = useState(0);

    useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }));

    // Sync display value and registry when value is changed externally
    // (e.g. form reset after submit, or pre-filling an existing comment for edit)
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
      const raw = value ?? '';
      const display = rawToDisplay(raw);
      setDisplayValue(display);
      mentionRegistry.current = buildRegistryFromRaw(raw);
    }, [value]);
    /* eslint-enable react-hooks/set-state-in-effect */

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
        const ta = taRef.current;
        const cursor = ta?.selectionStart ?? displayValue.length;
        const before = displayValue.slice(0, mentionStart);
        const after = displayValue.slice(cursor);
        const mentionDisplay = `@${user.name} `;
        const newDisplay = before + mentionDisplay + after;

        mentionRegistry.current.set(user.name, user.id);
        setDisplayValue(newDisplay);
        onChange(displayToRaw(newDisplay, mentionRegistry.current));
        setMentionQuery(null);

        requestAnimationFrame(() => {
          if (ta) {
            const pos = before.length + mentionDisplay.length;
            ta.selectionStart = pos;
            ta.selectionEnd = pos;
            ta.focus();
          }
        });
      },
      [displayValue, mentionStart, onChange],
    );

    const handleInput = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newDisplay = e.target.value;
        setDisplayValue(newDisplay);
        onChange(displayToRaw(newDisplay, mentionRegistry.current));
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
          value={displayValue}
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
