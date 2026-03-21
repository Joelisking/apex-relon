import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ClientDetailView } from '@/components/clients/ClientDetailView';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  let currentUser;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    );
    currentUser = {
      id: payload.sub || payload.id,
      role: payload.role,
      name: payload.name || payload.email,
    };
  } catch {
    redirect('/login');
  }

  const { id } = await params;
  const { tab } = await searchParams;

  return (
    <ClientDetailView
      clientId={id}
      currentUserId={currentUser.id}
      initialTab={tab || 'overview'}
    />
  );
}
