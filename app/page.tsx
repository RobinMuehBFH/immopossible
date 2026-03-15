import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user role from custom claim
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userRole = session?.user?.app_metadata?.user_role;

  // Redirect based on role
  if (userRole === 'tenant') {
    redirect('/portal');
  } else {
    // admin or property_manager
    redirect('/dashboard');
  }
}
