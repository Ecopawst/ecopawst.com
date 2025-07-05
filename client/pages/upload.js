import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function Upload() {
  const session = useSession();
  const router = useRouter();
  const [video, setVideo] = useState(null);
  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastUpload, setLastUpload] = useState(0);

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    const loadPets = async () => {
      const { data } = await supabase.from('pets').select('id,name').eq('user_id', session.user.id);
      setPets(data || []);
    };
    loadPets();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!video) return;
    if (Date.now() - lastUpload < 20000) { setMessage('Please wait before uploading again.'); return; }
    setMessage('');
    setLoading(true);

    if (!petId) throw new Error('Select a pet');

    const formData = new FormData();
    formData.append('file', video);
    let result;
    try {
      const resUpload = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/stream`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_TOKEN}` },
        body: formData
      });
      if (!resUpload.ok) throw new Error('Upload failed');
      ({ result } = await resUpload.json());
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'UploadError', message: err.message, stack: err.stack, context: { petId } })
      });
      console.error(err);
      setMessage('Upload failed.');
      setLoading(false);
      return;
    }

    try {
      const playbackUrl = result && result.playback ? result.playback.hls : null;
      if (!playbackUrl) throw new Error('Missing playback URL');

      const { data, error } = await supabase.from('posts').insert({
        pet_id: petId,
        video_url: playbackUrl
      }).select().single();

      if (error) throw error;

      const resCaption = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: data.id })
      });
      if (!resCaption.ok) throw new Error('Caption failed');

      setMessage('Upload complete!');
      setLastUpload(Date.now());
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'UploadSaveError', message: err.message, stack: err.stack, context: { petId } })
      });
      console.error(err);
      setMessage('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session) return null;

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <label className="block">Select Pet
        <select className="border p-2 w-full" value={petId} onChange={e => setPetId(e.target.value)}>
          <option value="">Select pet</option>
          {pets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <label className="block">Video
        <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />
      </label>
      <button type="submit" className="border px-4 py-2" disabled={loading}>{loading ? 'Uploading...' : 'Upload'}</button>
      {message && <p>{message}</p>}
    </form>
  );
}
