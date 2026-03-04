'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formsApi } from '@/lib/api/forms-client';
import type { FormFieldDefinition } from '@/lib/types';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface PublicFormSchema {
  id: string;
  name: string;
  description?: string | null;
  fields: FormFieldDefinition[];
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (val: string) => void;
}) {
  const baseClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors';

  if (field.type === 'textarea') {
    return (
      <textarea
        id={field.key}
        rows={4}
        required={field.required}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClass} resize-none`}
      />
    );
  }

  if (field.type === 'select' && field.options && field.options.length > 0) {
    return (
      <select
        id={field.key}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseClass} bg-white`}>
        <option value="">
          {field.placeholder || `Select ${field.label}...`}
        </option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={field.key}
      type={field.type === 'tel' ? 'tel' : field.type}
      required={field.required}
      placeholder={field.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={baseClass}
      autoComplete={
        field.type === 'email'
          ? 'email'
          : field.key === 'contactName' || field.key === 'fullName'
            ? 'name'
            : field.type === 'tel'
              ? 'tel'
              : undefined
      }
    />
  );
}

export default function PublicFormPage() {
  const params = useParams<{ apiKey: string }>();
  const apiKey = params?.apiKey ?? '';

  const [form, setForm] = useState<PublicFormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    formsApi
      .getPublic(apiKey)
      .then((data) => {
        setForm(data as PublicFormSchema);
        // Initialise values with empty strings
        const initial: Record<string, string> = {};
        (data as PublicFormSchema).fields.forEach((f) => {
          initial[f.key] = '';
        });
        setValues(initial);
      })
      .catch(() => setError('Form not found or no longer available.'))
      .finally(() => setLoading(false));
  }, [apiKey]);

  const handleChange = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await formsApi.submit(apiKey, values);
      setSubmitted(true);
    } catch {
      setSubmitError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Error state
  if (error || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-lg mx-auto w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">404</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Form Not Found
          </h1>
          <p className="text-sm text-gray-500">
            {error ??
              'This form does not exist or is no longer accepting responses.'}
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-lg mx-auto w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Thank you!
          </h1>
          <p className="text-sm text-gray-500">
            Your submission has been received. We&rsquo;ll be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg mx-auto w-full bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">{form.name}</h1>
          {form.description && (
            <p className="text-sm text-gray-500 mt-1">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label
                htmlFor={field.key}
                className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </label>
              <FormField
                field={field}
                value={values[field.key] ?? ''}
                onChange={(val) => handleChange(field.key, val)}
              />
            </div>
          ))}

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
