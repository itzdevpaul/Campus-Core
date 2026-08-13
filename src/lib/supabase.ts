import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface Profile {
  id: string;
  username: string;
  invite_code: string;
  premium_until: string | null;
  invited_by: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface Invite {
  id: string;
  inviter_id: string;
  invited_id: string;
  created_at: string;
}
