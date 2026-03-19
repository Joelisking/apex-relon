'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { KeyRound, Pencil, X, Check, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth-client';
import { toast } from 'sonner';

const roleBadgeClass: Record<string, string> = {
  CEO: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMIN: 'bg-primary/10 text-primary border-primary/20',
  BDM: 'bg-amber-50 text-amber-700 border-amber-200',
  DESIGNER: 'bg-pink-50 text-pink-700 border-pink-200',
  QS: 'bg-sky-50 text-sky-700 border-sky-200',
  SALES: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleEdit = () => {
    setName(user.name);
    setPhone(user.phone ?? '');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      updateUser({ name: updated.name, phone: updated.phone });
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-display tracking-tight">Profile</h2>
        <p className="text-muted-foreground mt-1">Your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{user.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Full Name
              </p>
              {editing ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm font-medium">{user.name}</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Email Address
              </p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Phone
              </p>
              {editing ? (
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-8 text-sm"
                />
              ) : (
                <p className="text-sm font-medium">
                  {user.phone || <span className="text-muted-foreground/50">—</span>}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Role
              </p>
              <Badge
                variant="outline"
                className={roleBadgeClass[user.role] ?? 'bg-muted text-muted-foreground border-border'}>
                {user.role}
              </Badge>
            </div>
          </div>

          {/* Edit action buttons */}
          {editing && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save Changes
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving} className="gap-2">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          )}

          <Separator />

          <div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/settings/change-password')}>
              <KeyRound className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
