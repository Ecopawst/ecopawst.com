import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// TODO: If sharing login across EcoAlaxy apps, set cookie options like:
// { auth: { cookieOptions: { domain: '.ecoalaxy.com' } } }
export const supabase = createClient(supabaseUrl, supabaseKey);
