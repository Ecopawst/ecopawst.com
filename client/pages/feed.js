import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('posts').select('id, video_url, caption, pet_id, is_pet_speaking, pets(name,profile_image_url, memorials(id))').order('created_at', { ascending: false });
      setPosts(data || []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold">Zoomie Feed</h1>
      {loading && <p>Loading...</p>}
      {posts.map(p => (
        <div key={p.id} className="border p-2 hover:shadow">
          <div className="flex items-center mb-2">
            {p.pets?.profile_image_url && (
              <img src={p.pets.profile_image_url} alt="Pet" className="w-8 h-8 object-cover rounded-full mr-2" />
            )}
            <span className="font-semibold">
              {p.is_pet_speaking && '🐾 '}
              {p.pets?.name}
              {p.pets?.memorials?.length ? ' 🌈' : ''}
            </span>
          </div>
        <ReactPlayer
          url={p.video_url}
          controls
          width="100%"
          height="100%"
          light
        />
          <p className={p.is_pet_speaking ? 'mt-2 bg-pink-50 p-1 rounded' : 'mt-2'}>
            {p.is_pet_speaking ? '🐾 ' : ''}{p.caption}
          </p>
        </div>
      ))}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="border px-2 py-1 text-sm mt-4">Back to Top</button>
    </div>
  );
}
