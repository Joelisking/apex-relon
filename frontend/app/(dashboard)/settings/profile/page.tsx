'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'BDM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DESIGNER':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'QS':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'SALES':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-display tracking-tight">Profile</h2>
        <p className="text-muted-foreground mt-1">Your account information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Full Name
              </p>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Email Address
              </p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Role
              </p>
              <Badge variant="outline" className={getRoleBadge(user.role)}>
                {user.role}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/settings/change-password')}
            >
              <KeyRound className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
