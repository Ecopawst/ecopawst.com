import '../styles/globals.css';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export default function App({ Component, pageProps }) {
  const [dark, setDark] = useState(false);
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={pageProps.initialSession}>
      <div className={dark ? 'dark' : ''}>
        <button onClick={() => setDark(!dark)} className="fixed bottom-4 right-4 border px-2 py-1 text-sm">{dark ? 'Light' : 'Dark'}</button>
        <Component {...pageProps} />
      </div>
    </SessionContextProvider>
  );
}
