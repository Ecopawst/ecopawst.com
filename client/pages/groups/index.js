import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function Groups() {
  const session = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('groups')
      .select('*')
      .eq('is_public', true)
      .then(({ data }) => setGroups(data || []));
  }, []);

  const join = async id => {
    if (!session) {
      router.push('/login');
      return;
    }
    const { data: exists } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (!exists) {
      await supabase
        .from('group_members')
        .insert({ group_id: id, user_id: session.user.id });
    }
  };

  return (
    <div className="p-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold mb-2">Groups</h1>
      <a href="/groups/create" className="border px-2 py-1 text-sm mb-2 inline-block">Create Group</a>
      <input
        placeholder="Search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      {groups
        .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
        .map(g => (
          <div key={g.id} className="border p-2 mb-2 flex justify-between">
            <span>{g.name}</span>
            <button onClick={() => join(g.id)} className="border px-2">Join</button>
          </div>
        ))}
    </div>
  );
}
