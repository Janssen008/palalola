import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const DEFAULT_SUPABASE_URL = 'https://ujomzsondbynwrletnvx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqb216c29uZGJ5bndybGV0bnZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2Nzc5OTAsImV4cCI6MjEwOTI1Mzk5MH0.Cdl2S1IITocm1wz40rD18EW83RikHNlrLl7OBev2C64';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_STORAGE_KEY = 'daily-task-maker-auth-token';

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storageKey: SUPABASE_STORAGE_KEY,
    },
  }
);
