import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function CreatePet() {
  const session = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', breed: '', age: '', photo: null, rescue_story: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session) return null;

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((f) => ({ ...f, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      let imageUrl = null;
      if (form.photo) {
        const fileExt = form.photo.name.split('.').pop();
        const filePath = `${Date.now()}-${session.user.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('pet-images').upload(filePath, form.photo);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('pet-images').getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }
      const { data, error } = await supabase.from('pets').insert({
        user_id: session.user.id,
        name: form.name,
        breed: form.breed,
        age: form.age ? parseInt(form.age) : null,
        rescue_story: form.rescue_story,
        profile_image_url: imageUrl
      }).select().single();
      if (error) throw error;
      setMessage('Pet profile created!');
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CreatePet', message: err.message, stack: err.stack })
      });
      setMessage('Error creating pet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold mb-4">Create Pet Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">Name
          <input name="name" placeholder="Name" className="border p-2 w-full" onChange={handleChange} />
        </label>
        <label className="block">Breed
          <input name="breed" placeholder="Breed" className="border p-2 w-full" onChange={handleChange} />
        </label>
        <label className="block">Age
          <input name="age" type="number" placeholder="Age" className="border p-2 w-full" onChange={handleChange} />
        </label>
        <label className="block">Photo
          <input name="photo" type="file" accept="image/*" className="w-full" onChange={handleChange} />
        </label>
        <label className="block">Rescue Story
          <textarea name="rescue_story" placeholder="Rescue Story" className="border p-2 w-full" onChange={handleChange}></textarea>
        </label>
        <button type="submit" className="border px-4 py-2" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </form>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
}
