import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

export default function Pawstory() {
  const router = useRouter();
  const { pet_id } = router.query;
  const [pet, setPet] = useState(null);
  const [posts, setPosts] = useState([]);
  const [memorial, setMemorial] = useState(null);

  useEffect(() => {
    if (!pet_id) return;
    const load = async () => {
      const { data: petData } = await supabase.from('pets').select('*').eq('id', pet_id).single();
      setPet(petData);
      const { data: postData } = await supabase.from('posts').select('*').eq('pet_id', pet_id).order('created_at');
      setPosts(postData || []);
      const { data: memData } = await supabase.from('memorials').select('*').eq('pet_id', pet_id).single();
      setMemorial(memData);
    };
    load();
  }, [pet_id]);

  if (!pet) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-4 space-y-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold">{pet.name}'s Pawstory</h1>
      {pet.profile_image_url && <img src={pet.profile_image_url} alt="Pet" className="w-32 h-32 object-cover rounded-full" />}
      <p>{pet.rescue_story}</p>
      <div className="space-y-4">
        {posts.map(p => (
          <div key={p.id} className="border p-2">
            <ReactPlayer url={p.video_url} controls width="100%" height="100%" light />
            {p.caption && <p className="mt-1">{p.caption}</p>}
          </div>
        ))}
      </div>
      {memorial && (
        <div className="border-t pt-4">
          <h2 className="font-semibold">In Memory</h2>
          <p>{memorial.tribute}</p>
        </div>
      )}
    </div>
  );
}
