import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');

  // Redirect to login if not authenticated, otherwise to dashboard
  if (!token) {
    redirect('/login');
  }

  redirect('/dashboard');
}
