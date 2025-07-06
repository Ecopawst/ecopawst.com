import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const session = useSession();
  const router = useRouter();
  const [flagged, setFlagged] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (session === null) router.push('/login');
    if (session && session.user.user_metadata.role !== 'admin') router.push('/');
  }, [session, router]);

  useEffect(() => {
    if (!session || session.user.user_metadata.role !== 'admin') return;
    supabase.from('posts').select('*').eq('flagged', true).then(({ data }) => setFlagged(data || []));
    supabase.from('users').select('*').then(({ data }) => setUsers(data || []));
  }, [session]);

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session || session.user.user_metadata.role !== 'admin') return null;

  const banUser = async (id, banned) => {
    await supabase.from('users').update({ banned: !banned }).eq('id', id);
    setUsers(users.map(u => u.id === id ? { ...u, banned: !banned } : u));
  };

  const deletePost = async (id) => {
    await supabase.from('posts').delete().eq('id', id);
    setFlagged(flagged.filter(p => p.id !== id));
  };

  return (
    <div className="p-4 space-y-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold">Admin Panel</h1>
      <div>
        <h2 className="font-semibold">Flagged Posts</h2>
        {flagged.map(p => (
          <div key={p.id} className="border p-2 mb-2">
            <p>{p.caption}</p>
            <button className="text-red-600" onClick={() => deletePost(p.id)}>Delete</button>
          </div>
        ))}
      </div>
      <div>
        <h2 className="font-semibold mt-4">Users</h2>
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between border p-2 mb-2">
            <span>{u.email}</span>
            <button onClick={() => banUser(u.id, u.banned)} className="underline">{u.banned ? 'Unban' : 'Ban'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
