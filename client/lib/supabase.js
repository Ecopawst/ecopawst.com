import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const cookieDomain = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN || undefined;
const options = cookieDomain ? { auth: { cookieOptions: { domain: cookieDomain } } } : {};

export const supabase = createClient(supabaseUrl, supabaseKey, options);
