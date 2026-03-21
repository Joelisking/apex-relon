import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose';
import { ADMIN_PANEL_PERMISSIONS } from '@/lib/admin-panel-permissions';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userPerms = (payload.permissions as string[]) ?? [];
    const hasAdminAccess = userPerms.some((p) =>
      (ADMIN_PANEL_PERMISSIONS as readonly string[]).includes(p),
    );

    if (!hasAdminAccess) {
      redirect('/dashboard');
    }
  } catch {
    redirect('/login');
  }

  return <>{children}</>;
}
