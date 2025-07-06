import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

export default function PetGallery() {
  const router = useRouter();
  const { pet_id } = router.query;
  const [posts, setPosts] = useState([]);
  const [pet, setPet] = useState(null);

  useEffect(() => {
    if (!pet_id) return;
    const load = async () => {
      const { data: petData } = await supabase.from('pets').select('name').eq('id', pet_id).single();
      setPet(petData);
      const { data } = await supabase.from('posts').select('id,video_url,caption').eq('pet_id', pet_id).order('created_at');
      setPosts(data || []);
    };
    load();
  }, [pet_id]);

  if (!pet) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold mb-4">{pet.name}&apos;s Gallery</h1>
      <div className="grid grid-cols-2 gap-4">
        {posts.map(p => (
          <div key={p.id} className="border p-2 hover:shadow">
            <ReactPlayer url={p.video_url} controls width="100%" height="160px" light />
            {p.caption && <p className="mt-1 text-sm">{p.caption}</p>}
          </div>
        ))}
      </div>
      <Link href="/upload" className="block mt-4 underline">Upload More</Link>
    </div>
  );
}
