import ProjectsView from '@/components/projects/ProjectsView';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

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

  return <ProjectsView currentUser={currentUser} />;
}
