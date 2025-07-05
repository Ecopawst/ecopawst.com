import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

export default function DonateGroup() {
  const router = useRouter();
  const { group_id } = router.query;
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('10');

  useEffect(() => {
    if (!group_id) return;
    const load = async () => {
      const { data } = await supabase.from('donation_groups').select('*').eq('id', group_id).single();
      setGroup(data);
    };
    load();
  }, [group_id]);

  if (!group) return <div className="p-4">Loading...</div>;

  const handleDonate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group_id, donorName, amount: parseFloat(amount) })
      });
      const data = await res.json();
      if (res.ok) window.location.href = data.url;
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'Donate', message: err.message, stack: err.stack, context: { group_id } })
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-2">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      <h1 className="text-xl font-bold">{group.name}</h1>
      <p>{group.description}</p>
      <p>Raised: {group.raised_amount} / {group.target_amount}</p>
      <div className="space-y-2">
        <input className="border p-2 w-full" placeholder="Your name" value={donorName} onChange={e => setDonorName(e.target.value)} />
        <input className="border p-2 w-full" type="number" step="1" min="1" value={amount} onChange={e => setAmount(e.target.value)} />
        <button className="border px-4 py-2" onClick={handleDonate} disabled={loading}>{loading ? 'Processing...' : 'Donate'}</button>
      </div>
    </div>
  );
}
