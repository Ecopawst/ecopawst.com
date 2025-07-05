import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

export default function Groups() {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    supabase.from('donation_groups').select('*').then(({ data }) => setGroups(data || []));
  }, []);

  return (
    <div className="p-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold mb-2">Donation Groups</h1>
      {groups.map(g => (
        <div key={g.id} className="border p-2 mb-2">{g.name}</div>
      ))}
    </div>
  );
}
