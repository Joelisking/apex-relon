'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, User2, Phone, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api/auth-client';
import { toast } from 'sonner';

export function CompleteProfileModal() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user?.mustCompleteProfile) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (newPassword && newPassword.length < 8)
      e.newPassword = 'Password must be at least 8 characters';
    if (newPassword && newPassword !== confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    if (newPassword && !currentPassword)
      e.currentPassword = 'Enter your temporary password to set a new one';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Update profile (clears mustCompleteProfile on backend)
      const updated = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      updateUser({
        name: updated.name,
        phone: updated.phone,
        mustCompleteProfile: false,
      });

      // Optionally change password if the user filled it in
      if (newPassword) {
        await authApi.changePassword(currentPassword, newPassword);
      }

      toast.success('Profile set up — welcome to Apex CRM!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary/5 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Complete Your Profile</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Welcome! Set up your account before continuing.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <User2 className="h-3.5 w-3.5" />
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Phone Number
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" />
              Change Password (optional)
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Current (temp) password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Temporary Password
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Your temporary password"
              className={errors.currentPassword ? 'border-destructive' : ''}
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword}</p>
            )}
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              New Password
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className={errors.newPassword ? 'border-destructive' : ''}
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword}</p>
            )}
          </div>

          {/* Confirm new password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end">
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Complete Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
