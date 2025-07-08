import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function BugsPage() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const role = data?.user?.user_metadata?.role;
      if (role !== 'admin') {
        router.push('/');
        return;
      }
      supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (!error) setBugs(data);
          setLoading(false);
        });
    });
  }, [router]);

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">🐞 EcoMaintainer Bug Tracker</h1>
      {bugs.length === 0 && <p>No bug reports yet. System is clean 🧼</p>}
      {bugs.map((bug, i) => (
        <div key={i} className="border p-4 mb-4 rounded-md shadow-sm bg-white">
          <h2 className="font-semibold text-lg">{bug.type}</h2>
          <p className="text-sm text-gray-500">{new Date(bug.created_at).toLocaleString()}</p>
          <pre className="mt-2 text-red-600 text-sm">{bug.message}</pre>
          <details className="mt-1 text-xs text-gray-700">
            <summary>Context</summary>
            <pre>{JSON.stringify(bug.context, null, 2)}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}
