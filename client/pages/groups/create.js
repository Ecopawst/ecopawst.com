import { useState } from 'react';
import Head from 'next/head';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function CreateGroup() {
  const session = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '', is_public: true, is_cause: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session) return null;

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.from('groups').insert({
        name: form.name,
        description: form.description,
        is_public: form.is_public,
        is_cause: form.is_cause,
        creator_id: session.user.id
      }).select().single();
      if (error) throw error;
      router.push(`/groups/${data.id}`);
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CreateGroup', message: err.message, stack: err.stack })
      });
      console.error(err);
      setMessage('Error creating group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold mb-4">Create Group</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">Name
          <input name="name" className="border p-2 w-full" value={form.name} onChange={handleChange} />
        </label>
        <label className="block">Description
          <textarea name="description" className="border p-2 w-full" value={form.description} onChange={handleChange} />
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" name="is_public" checked={form.is_public} onChange={handleChange} />
          <span>Public Group</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" name="is_cause" checked={form.is_cause} onChange={handleChange} />
          <span>Cause (enable donations)</span>
        </label>
        <button type="submit" className="border px-4 py-2" disabled={loading}>{loading ? 'Saving...' : 'Create'}</button>
      </form>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
}
