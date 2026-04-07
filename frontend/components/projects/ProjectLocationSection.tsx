'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AddressAutocomplete } from './AddressAutocomplete';

interface ProjectLocationSectionProps {
  onGeocode: (lat: number | null, lng: number | null) => void;
}

export function ProjectLocationSection({ onGeocode }: ProjectLocationSectionProps) {
  const form = useFormContext();

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Location</p>

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site Address</FormLabel>
            <FormControl>
              <AddressAutocomplete
                value={field.value ?? ''}
                onChange={(address, lat, lng) => {
                  field.onChange(address);
                  if (lat !== null && lng !== null) {
                    form.setValue('latitude', lat);
                    form.setValue('longitude', lng);
                    onGeocode(lat, lng);
                  } else {
                    onGeocode(null, null);
                  }
                }}
                placeholder="Search for site address…"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="latitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Latitude</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 41.0793"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value;
                    field.onChange(val);
                    onGeocode(val === null ? null : Number(val), form.getValues('longitude'));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="longitude"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Longitude</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. -85.1394"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value;
                    field.onChange(val);
                    onGeocode(form.getValues('latitude'), val === null ? null : Number(val));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
