import { useEffect } from 'react';
import Head from 'next/head';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function Login() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push('/');
  }, [session, router]);

  return (
    <div className="p-8 max-w-md mx-auto">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} />
    </div>
  );
}
