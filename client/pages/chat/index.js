import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function ChatHome() {
  const session = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState('');

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  useEffect(() => {
    supabase.from('groups').select('*').then(({ data }) => setGroups(data || []));
  }, []);

  const createGroup = async () => {
    if (!newGroup) return;
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({ name: newGroup, creator_id: session.user.id })
        .select()
        .single();
      if (!error) {
        await supabase.from('group_members').insert({ group_id: data.id, user_id: session.user.id });
      }
      if (!error) {
        router.push(`/chat/${data.id}`);
      }
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ChatCreateGroup', message: err.message, stack: err.stack })
      });
      console.error(err);
    }
  };

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session) return null;

  return (
    <div className="p-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold mb-2">Chats</h1>
      <div className="space-y-2">
        {groups.map(g => (
          <Link key={g.id} href={`/chat/${g.id}`} className="block border p-2 hover:bg-gray-50">
            {g.name}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex space-x-2">
        <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="New group" className="border p-2 flex-grow" />
        <button onClick={createGroup} className="border px-2">Create</button>
      </div>
    </div>
  );
}
