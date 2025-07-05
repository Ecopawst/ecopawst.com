import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function Chat() {
  const session = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [newGroup, setNewGroup] = useState('');

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  useEffect(() => {
    const loadGroups = async () => {
      const { data } = await supabase.from('chat_groups').select('*');
      setGroups(data || []);
    };
    loadGroups();
  }, []);

  useEffect(() => {
    if (!currentGroup) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from('chats')
        .select('id,message,created_at,sender_id,users(email,avatar_url)')
        .eq('group_id', currentGroup)
        .order('created_at');
      setMessages(data || []);
    };
    loadMessages();
    const channel = supabase.channel('chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async payload => {
        if (payload.new.group_id === currentGroup) {
          const { data } = await supabase
            .from('chats')
            .select('id,message,created_at,sender_id,users(email,avatar_url)')
            .eq('id', payload.new.id)
            .single();
          setMessages(m => [...m, data]);
        }
      }).subscribe();
    return () => { channel.unsubscribe(); };
  }, [currentGroup]);

  const sendMessage = async () => {
    if (!currentGroup || !text) return;
    try {
      const { data: group } = await supabase.from('chat_groups').select('members').eq('id', currentGroup).single();
      if (group && group.members && !group.members.includes(session.user.id)) {
        await supabase.from('chat_groups').update({ members: [...group.members, session.user.id] }).eq('id', currentGroup);
      }
      const { data, error } = await supabase
        .from('chats')
        .insert({ group_id: currentGroup, sender_id: session.user.id, message: text })
        .select('id,message,created_at,sender_id,users(email,avatar_url)')
        .single();
      if (!error) {
        setMessages(m => [...m, data]);
        setText('');
      }
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ChatSend', message: err.message, stack: err.stack, context: { currentGroup } })
      });
      console.error(err);
    }
  };

  const createGroup = async () => {
    if (!newGroup) return;
    try {
      const { data, error } = await supabase
        .from('chat_groups')
        .insert({ name: newGroup, members: [session.user.id] })
        .select()
        .single();
      if (!error) {
        setGroups(g => [...g, data]);
        setCurrentGroup(data.id);
        setNewGroup('');
      }
    } catch (err) {
      await fetch('/api/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ChatCreateGroup', message: err.message, stack: err.stack })
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
      <h1 className="text-xl font-bold">Chat</h1>
      <div className="flex space-x-2 mt-2">
        <select className="border p-2 flex-grow" value={currentGroup} onChange={e => setCurrentGroup(e.target.value)}>
          <option value="">Select group</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="New group" className="border p-2 flex-grow" />
        <button onClick={createGroup} className="border px-2">Create</button>
      </div>
      <div className="mt-4 border p-2 h-64 overflow-y-auto" aria-live="polite">
        {messages.map(m => (
          <div key={m.id} className="mb-1">
            <div className="text-xs text-gray-500">
              {m.users ? m.users.email : 'Someone'} – {dayjs(m.created_at).format('HH:mm')}
            </div>
            <div>{m.message}</div>
          </div>
        ))}
      </div>
      <div className="flex mt-2">
        <label className="flex-grow">
          <input value={text} onChange={e => setText(e.target.value)} className="w-full border p-2" placeholder="Message" />
        </label>
        <button onClick={sendMessage} className="border px-4">Send</button>
      </div>
    </div>
  );
}
