import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';

export default function GroupPage() {
  const session = useSession();
  const router = useRouter();
  const { group_id } = router.query;
  const [group, setGroup] = useState(null);
  const [donationGroup, setDonationGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState('');
  const [petSpeaking, setPetSpeaking] = useState(false);

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  useEffect(() => {
    if (!group_id) return;
    supabase
      .from('groups')
      .select('*')
      .eq('id', group_id)
      .single()
      .then(({ data }) => {
        setGroup(data);
        if (data?.is_donation_group && data.donation_group_id) {
          supabase
            .from('donation_groups')
            .select('*')
            .eq('id', data.donation_group_id)
            .single()
            .then(({ data }) => setDonationGroup(data));
        }
      });
    supabase
      .from('group_members')
      .select('id,user_id,pet_id,pets(name,profile_image_url),users(email,avatar_url)')
      .eq('group_id', group_id)
      .then(({ data }) => setMembers(data || []));
  }, [group_id]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('pets')
      .select('id,name,profile_image_url,memorials(id),speak_as_default')
      .eq('user_id', session.user.id)
      .then(({ data }) => {
        setPets(data || []);
        const def = (data || []).find(p => p.speak_as_default);
        if (def) { setPetId(def.id); setPetSpeaking(true); }
      });
  }, [session]);

  useEffect(() => {
    if (!group_id) return;
    const load = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id,message,created_at,user_id,pet_id,is_pet_speaking,users(email,avatar_url),pets(name,profile_image_url,memorials(id))')
        .eq('group_id', group_id)
        .order('created_at');
      setMessages(data || []);
    };
    load();
    const channel = supabase.channel('chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        if (payload.new.group_id === group_id) {
          supabase
            .from('chat_messages')
            .select('id,message,created_at,user_id,pet_id,is_pet_speaking,users(email,avatar_url),pets(name,profile_image_url,memorials(id))')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) setMessages(m => [...m, data]);
            });
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [group_id]);

  const sendMessage = async () => {
    if (!text || !group_id) return;
    try {
      const { data: exists } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group_id)
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!exists) {
        await supabase.from('group_members').insert({ group_id, user_id: session.user.id });
      }
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ group_id, user_id: session.user.id, pet_id: petId || null, is_pet_speaking: petSpeaking && petId, message: text })
        .select('id,message,created_at,user_id,pet_id,is_pet_speaking,users(email,avatar_url),pets(name,profile_image_url,memorials(id))')
        .single();
      if (!error) {
        setMessages(m => [...m, data]);
        setText('');
      }
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'GroupChatSend', message: err.message, stack: err.stack, context: { group_id } })
      });
      console.error(err);
    }
  };

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session) return null;

  return (
    <div className="p-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      {group && (
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold">{group.name}</h1>
          {group.is_donation_group && donationGroup && (
            <a href={`/donate/${donationGroup.id}`} className="border px-2 py-1 text-sm">Donate</a>
          )}
        </div>
      )}
      <div className="mb-2 text-sm text-gray-600">{group?.description}</div>
      {group?.is_donation_group && donationGroup && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-green-500 rounded"
              style={{ width: `${Math.min(100, (donationGroup.raised_amount / donationGroup.target_amount) * 100)}%` }}
            />
          </div>
          <div className="text-sm mt-1">Raised {donationGroup.raised_amount} / {donationGroup.target_amount}. Every pawprint counts.</div>
        </div>
      )}
      <h2 className="font-semibold mt-4">Members</h2>
      <div className="flex space-x-2 mb-4">
        {members.map(m => (
          <div key={m.id} className="text-center">
            {m.pet_id && m.pets ? (
              <img src={m.pets.profile_image_url} alt="pet" className="w-8 h-8 rounded-full" />
            ) : (
              <img src={m.users?.avatar_url} alt="user" className="w-8 h-8 rounded-full" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 border p-2 h-64 overflow-y-auto" aria-live="polite">
        {messages.map(m => (
          <div key={m.id} className="mb-2">
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              {m.is_pet_speaking && m.pet_id && m.pets ? (
                <>
                  {m.pets.profile_image_url && <img src={m.pets.profile_image_url} alt="Pet" className="w-5 h-5 rounded-full" />}
                  <span>{m.pets.name}{m.pets.memorials?.length ? ' 🌈' : ''}</span>
                </>
              ) : (
                <>
                  {m.users?.avatar_url && <img src={m.users.avatar_url} alt="User" className="w-5 h-5 rounded-full" />}
                  <span>{m.users ? m.users.email : 'Someone'}</span>
                </>
              )}
              <span>- {dayjs(m.created_at).format('HH:mm')}</span>
            </div>
            <div className={m.is_pet_speaking ? 'bg-pink-50 p-1 rounded' : ''}>
              {m.is_pet_speaking ? '🐾 ' : ''}{m.message}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <select value={petId} onChange={e => setPetId(e.target.value)} className="border p-2">
          <option value="">Select pet</option>
          {pets.map(p => (
            <option key={p.id} value={p.id}>{p.name}{p.memorials?.length ? ' 🌈' : ''}</option>
          ))}
        </select>
        <label className="flex items-center space-x-1">
          <input type="checkbox" checked={petSpeaking} onChange={e => setPetSpeaking(e.target.checked)} />
          <span className="text-sm">
            🐾 Speak as {petId ? `${pets.find(p => p.id === petId)?.name}${pets.find(p => p.id === petId)?.memorials?.length ? ' 🌈' : ''}` : 'pet'}
          </span>
        </label>
        <input value={text} onChange={e => setText(e.target.value)} className="flex-grow border p-2" placeholder="Message" />
        <button onClick={sendMessage} className="border px-4">Send</button>
      </div>
    </div>
  );
}
