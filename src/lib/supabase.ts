import { createClient } from "@supabase/supabase-js";

// cast import.meta to any to avoid TypeScript "Property 'env' does not exist on type 'ImportMeta'" error
const supabaseUrl =
  (import.meta as any).VITE_SUPABASE_URL ||
  "https://ltkfjgzpmvshxftbbofy.supabase.co";
const supabaseAnonKey =
  (import.meta as any).VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0a2ZqZ3pwbXZzaHhmdGJib2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODAzNjAsImV4cCI6MjEwMzc1NjM2MH0.b3yr0oef7H9ybGo-IPUvsww_ZoDEeZU1mC_5CIGd4TU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
