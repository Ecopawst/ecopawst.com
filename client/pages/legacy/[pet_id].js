import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

export default function LegacyPage() {
  const router = useRouter();
  const { pet_id } = router.query;
  const [pet, setPet] = useState(null);
  const [posts, setPosts] = useState([]);
  const [memorial, setMemorial] = useState(null);
  const [flowers, setFlowers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!pet_id) return;
    const load = async () => {
      const { data: p } = await supabase
        .from('pets')
        .select('*, users(email)')
        .eq('id', pet_id)
        .single();
      setPet(p);
      const { data: ps } = await supabase.from('posts').select('*').eq('pet_id', pet_id).order('created_at');
      setPosts(ps || []);
      const { data: mem } = await supabase.from('memorials').select('*').eq('pet_id', pet_id).single();
      setMemorial(mem);
      if (mem) {
        const { data: fl } = await supabase
          .from('pawflowers')
          .select('*, users(email)')
          .eq('memorial_id', mem.id)
          .order('created_at');
        setFlowers(fl || []);
      }
      const { data: groups } = await supabase
        .from('group_members')
        .select('groups(id,name,is_donation_group,donation_group_id)')
        .eq('pet_id', pet_id);
      const dgIds = (groups || [])
        .map(g => g.groups)
        .filter(g => g && g.is_donation_group && g.donation_group_id)
        .map(g => g.donation_group_id);
      if (dgIds.length) {
        const { data: dons } = await supabase
          .from('donations')
          .select('id,amount,donor_name,created_at,donation_groups(name)')
          .in('donation_group_id', dgIds);
        setDonations(dons || []);
      }
    };
    load();
  }, [pet_id]);

  useEffect(() => {
    const items = [];
    posts.forEach(p => items.push({
      id: `post-${p.id}`,
      type: 'post',
      created_at: p.created_at,
      data: p
    }));
    flowers.forEach(f => items.push({
      id: `flower-${f.id}`,
      type: 'pawflower',
      created_at: f.created_at,
      data: f
    }));
    if (memorial) {
      items.push({
        id: `mem-${memorial.id}`,
        type: 'tribute',
        created_at: memorial.created_at,
        data: memorial
      });
    }
    donations.forEach(d => items.push({
      id: `don-${d.id}`,
      type: 'donation',
      created_at: d.created_at,
      data: d
    }));
    items.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    setEntries(items);
  }, [posts, flowers, memorial, donations]);

  const addFlower = async () => {
    if (!memorial || !text) return;
    try {
      const res = await fetch('/api/pawflower', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memorialId: memorial.id, message: text })
      });
      const data = await res.json();
      if (res.ok) {
        setFlowers(f => [...f, data]);
        setText('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch('/api/backup-memorychain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      const name = pet.name ? pet.name.replace(/\s+/g, '_') : 'memorychain';
      link.href = URL.createObjectURL(blob);
      link.download = `${name}_memorychain_backup.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Download failed');
    }
  };

  if (!pet) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-4 space-y-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold">{pet.name}'s Legacy</h1>
      {pet.profile_image_url && (
        <img src={pet.profile_image_url} alt="Pet" className="w-32 h-32 object-cover rounded-full" />
      )}
      {pet.breed && <p>Breed: {pet.breed}</p>}
      {pet.users && <p>Guardian: {pet.users.email}</p>}
      {pet.date_of_passing && <p>Passed on {pet.date_of_passing}</p>}
      <p>{pet.rescue_story}</p>
      {memorial && (
        <div className="bg-gray-50 p-2 rounded">
          <h2 className="font-semibold">Tribute</h2>
          <p>{memorial.tribute}</p>
        </div>
      )}
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="border p-2 rounded">
            <ReactPlayer url={post.video_url} controls width="100%" height="100%" />
            <p className="text-xs text-gray-500 mt-1">{new Date(post.created_at).toLocaleString()}</p>
            {post.caption && <p className="mt-1">{post.caption}</p>}
          </div>
        ))}
      </div>
      {memorial && (
        <div className="border-t pt-4">
          <h2 className="font-semibold">Pawflowers</h2>
          {flowers.map((f,i) => (
            <div key={i} className="text-sm border-b py-1">
              <span className="font-semibold mr-1">{f.users ? f.users.email : 'Anon'}:</span> {f.message}
            </div>
          ))}
          <div className="flex mt-2">
            <input value={text} onChange={e => setText(e.target.value)} className="flex-grow border p-2" placeholder="Leave a memory" />
            <button onClick={addFlower} className="border px-4">Post</button>
          </div>
        </div>
      )}
      {entries.length > 0 && (
        <div className="border-t pt-4">
          <h2 className="font-semibold">🧬 MemoryChain {pet.is_memorialized && '🔒'}</h2>
          <ul className="space-y-3">
            {entries.map(e => (
              <li key={e.id} className="border p-2 rounded">
                <p className="text-xs text-gray-500 mb-1">{new Date(e.created_at).toLocaleString()}</p>
                {e.type === 'post' && (
                  <>
                    <ReactPlayer url={e.data.video_url} controls width="100%" height="100%" />
                    {e.data.caption && <p className="mt-1 text-sm">{e.data.caption}</p>}
                  </>
                )}
                {e.type === 'pawflower' && (
                  <p className="text-sm"><span className="font-semibold mr-1">{e.data.users ? e.data.users.email : 'Anon'}:</span> {e.data.message}</p>
                )}
                {e.type === 'tribute' && (
                  <p className="italic">{e.data.tribute}</p>
                )}
                {e.type === 'donation' && (
                  <p className="text-sm">Donation to {e.data.donation_groups?.name || 'Group'}: ${e.data.amount} from {e.data.donor_name || 'Anon'}</p>
                )}
              </li>
            ))}
          </ul>
          <button className="border px-4 py-2 mt-2" onClick={handleDownload}>
            🧠 Download MemoryChain
          </button>
        </div>
      )}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="border px-2 py-1 text-sm">Back to Top</button>
    </div>
  );
}
