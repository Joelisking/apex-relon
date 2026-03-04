import { PipelineSettingsView } from '@/components/admin/PipelineSettingsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminPipelinePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) redirect('/login');

  let currentUser;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    currentUser = {
      id: payload.sub || payload.id,
      role: payload.role,
      name: payload.name || payload.email,
    };
  } catch {
    redirect('/login');
  }

  // Only CEO and ADMIN can manage pipeline settings
  if (!['CEO', 'ADMIN'].includes(currentUser.role)) {
    redirect('/dashboard');
  }

  return <PipelineSettingsView />;
}
