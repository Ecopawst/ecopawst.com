import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../../lib/supabase';

export default function PetProfile() {
  const router = useRouter();
  const { pet_id } = router.query;
  const [pet, setPet] = useState(null);

  useEffect(() => {
    if (!pet_id) return;
    supabase.from('pets').select('*').eq('id', pet_id).single().then(({ data }) => setPet(data));
  }, [pet_id]);

  if (!pet) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-4 space-y-2">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      {pet.profile_image_url && (
        <img src={pet.profile_image_url} alt="Pet" className="w-32 h-32 object-cover rounded-full" />
      )}
      <h1 className="text-xl font-bold">{pet.name}</h1>
      <p>Breed: {pet.breed}</p>
      <p>Age: {pet.age}</p>
      <p>{pet.rescue_story}</p>
      <a href={`/pets/${pet_id}/gallery`} className="underline">View Gallery</a>
    </div>
  );
}
