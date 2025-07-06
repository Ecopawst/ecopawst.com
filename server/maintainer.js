import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function reportBug({ type, message, stack, context = {} }) {
  return await supabase.from('bug_reports').insert([
    { type, message, stack, context, resolved: false }
  ]);
}

export async function tryAutoRepair(error) {
  console.log('[EcoMaintainer] Auto-repair not yet enabled.');
  // In future: call Codex or Virex via endpoint for repair suggestions.
}
