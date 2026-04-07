'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { useMapboxGeocoding, type GeocodingSuggestion } from '@/hooks/useMapboxGeocoding';
import { cn } from '@/lib/utils';

export interface AddressParts {
  street: string;
  city: string;
  state: string; // 2-letter code, e.g. "IN"
  zip: string;
}

interface AddressAutocompleteWithPartsProps {
  value: string;
  /** Called on every keystroke. parts is non-null only when the user picks a suggestion. */
  onChange: (street: string, parts: AddressParts | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function parseSuggestion(s: GeocodingSuggestion): AddressParts {
  const streetNum = s.address ?? '';
  const streetName = s.text ?? '';
  const street = [streetNum, streetName].filter(Boolean).join(' ');

  let city = '';
  let state = '';
  let zip = '';

  for (const ctx of s.context ?? []) {
    if (ctx.id.startsWith('postcode.')) zip = ctx.text;
    else if (ctx.id.startsWith('place.')) city = ctx.text;
    else if (ctx.id.startsWith('region.')) {
      // short_code is like "US-IN" — take the part after "-"
      state = ctx.short_code ? ctx.short_code.replace(/^US-/, '') : ctx.text;
    }
  }

  return { street, city, state, zip };
}

export function AddressAutocompleteWithParts({
  value,
  onChange,
  placeholder = 'Search for an address…',
  className,
  disabled = false,
}: AddressAutocompleteWithPartsProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { suggestions, isLoading } = useMapboxGeocoding(inputValue, open || inputValue.length >= 3);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(s: GeocodingSuggestion) {
    const parts = parseSuggestion(s);
    setInputValue(parts.street || s.place_name);
    setOpen(false);
    onChange(parts.street || s.place_name, parts);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputValue(v);
    setOpen(true);
    onChange(v, null);
  }

  const showDropdown = open && inputValue.length >= 3 && (isLoading || suggestions.length > 0);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 3 && setOpen(true)}
          placeholder={placeholder}
          className="pl-8"
          autoComplete="off"
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {isLoading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
          ) : (
            <ul className="py-1 max-h-52 overflow-auto">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-start gap-2"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(s)}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="leading-snug">{s.place_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
