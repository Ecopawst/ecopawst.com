import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';

export default function Me() {
  const session = useSession();
  const router = useRouter();
  const [pets, setPets] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [myGroups, setMyGroups] = useState([]);

  const uploadAvatar = async () => {
    if (!avatar) return;
    const fileExt = avatar.name.split('.').pop();
    const filePath = `${Date.now()}-${session.user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatar);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', session.user.id);
      setUserInfo(u => ({ ...u, avatar_url: urlData.publicUrl }));
    }
  };

  useEffect(() => {
    if (session === null) router.push('/login');
  }, [session, router]);

  useEffect(() => {
    if (!session) return;
    supabase.from('pets').select('*').eq('user_id', session.user.id).then(({ data }) => setPets(data || []));
    supabase.from('users').select('*').eq('id', session.user.id).single().then(({ data }) => setUserInfo(data));
    supabase
      .from('group_members')
      .select('groups(id,name)')
      .eq('user_id', session.user.id)
      .then(({ data }) => setMyGroups(data?.map(g => g.groups) || []));
  }, [session]);

  if (session === undefined) return <p className="p-4">Loading...</p>;
  if (!session) return null;

  return (
    <div className="p-4">
      <Head>
        <title>EcoPawst – A World Built for Tails</title>
        <meta name="description" content="Create pet profiles, share Zoomies, honor lost companions, and support rescue missions – all in one loving platform." />
      </Head>
      {userInfo && (
        <div className="mb-4">
          {userInfo.avatar_url && <img src={userInfo.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full mb-2" />}
          <div className="flex items-center space-x-2">
            <input type="file" accept="image/*" onChange={e => setAvatar(e.target.files[0])} />
            <button onClick={uploadAvatar} className="border px-2">Upload</button>
          </div>
        </div>
      )}
      <h1 className="text-xl font-bold mb-2">Your Pets</h1>
      {pets.map(p => (
        <a key={p.id} href={`/pets/${p.id}`} className="flex items-center border p-2 mb-2 hover:bg-gray-50">
          {p.profile_image_url && <img src={p.profile_image_url} alt="Pet" className="w-12 h-12 object-cover rounded-full mr-2" />}
          <span>{p.name}</span>
        </a>
      ))}
      {myGroups.length > 0 && (
        <>
          <h2 className="text-lg font-bold mt-4 mb-2">My Packs</h2>
          {myGroups.map(g => (
            <a key={g.id} href={`/groups/${g.id}`} className="block border p-2 mb-2 hover:bg-gray-50">{g.name}</a>
          ))}
        </>
      )}
    </div>
  );
}
