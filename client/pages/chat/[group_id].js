import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';

export default function ChatGroup() {
  const session = useSession();
  const router = useRouter();
  const { group_id } = router.query;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState('');
  const [petSpeaking, setPetSpeaking] = useState(false);

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    supabase.from('pets').select('id,name,profile_image_url,memorials(id)')
      .eq('user_id', session.user.id)
      .then(({ data }) => setPets(data || []));
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
          supabase.from('chat_messages')
            .select('id,message,created_at,user_id,pet_id,is_pet_speaking,users(email,avatar_url),pets(name,profile_image_url,memorials(id))')
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) setMessages(m => [...m, data]);
            });
        }
      }).subscribe();
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
        .single();
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
        body: JSON.stringify({ type: 'ChatSend', message: err.message, stack: err.stack, context: { group_id } })
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
      <h1 className="text-xl font-bold mb-2">Group Chat</h1>
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
            <div>{m.message}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <select value={petId} onChange={e => setPetId(e.target.value)} className="border p-2">
          <option value="">Select pet</option>
          {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="flex items-center space-x-1">
          <input type="checkbox" checked={petSpeaking} onChange={e => setPetSpeaking(e.target.checked)} />
          <span className="text-sm">🐾 Speak as pet</span>
        </label>
        <input value={text} onChange={e => setText(e.target.value)} className="flex-grow border p-2" placeholder="Message" />
        <button onClick={sendMessage} className="border px-4">Send</button>
      </div>
    </div>
  );
}
