import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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

  let role: string;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    role = payload.role;
  } catch {
    redirect('/login');
  }

  if (!['CEO', 'ADMIN', 'BDM'].includes(role)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
