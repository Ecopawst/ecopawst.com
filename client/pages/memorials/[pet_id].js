import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

export default function Memorial() {
  const router = useRouter();
  const { pet_id } = router.query;
  const [memorial, setMemorial] = useState(null);
  const [pet, setPet] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!pet_id) return;
    const load = async () => {
      const { data } = await supabase.from('memorials').select('*').eq('pet_id', pet_id).single();
      setMemorial(data);
      if (data) {
        const { data: petInfo } = await supabase.from('pets').select('*').eq('id', data.pet_id).single();
        setPet(petInfo);
        const { data: c } = await supabase.from('memorial_comments').select('*').eq('memorial_id', data.id);
        setComments(c || []);
      }
    };
    load();
  }, [pet_id]);

  const addComment = async () => {
    if (!memorial || !text) return;
    const { error } = await supabase.from('memorial_comments').insert({ memorial_id: memorial.id, comment: text });
    if (!error) {
      setComments(cs => [...cs, { comment: text }]);
      setText('');
    }
  };

  if (!memorial) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-2">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold">Memorial</h1>
      {pet && (
        <div className="space-y-1">
          <p className="font-semibold">{pet.name}</p>
          {pet.breed && <p>Breed: {pet.breed}</p>}
          {pet.age && <p>Age: {pet.age}</p>}
        </div>
      )}
      <p>{memorial.tribute}</p>
      <div className="mt-4 space-y-1" aria-live="polite">
        {comments.map((c,i) => <div key={i}>{c.comment}</div>)}
      </div>
      <div className="flex mt-2">
        <input value={text} onChange={e => setText(e.target.value)} className="flex-grow border p-2" placeholder="Leave a memory" />
        <button onClick={addComment} className="border px-4">Post</button>
      </div>
      {pet && pet.is_legacy && (
        <a href={`/legacy/${pet.id}`} className="underline block mt-2">🕊 Visit My Legacy Page</a>
      )}
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="border px-2 py-1 text-sm mt-4">Back to Top</button>
    </div>
  );
}
