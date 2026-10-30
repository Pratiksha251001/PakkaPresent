import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "../supabase";

const platformStorage =
  typeof window === "undefined" ? undefined : window.sessionStorage;
export const platformSupabase = createClient(
  isSupabaseConfigured
    ? supabaseUrl
    : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseKey : "placeholder-anon-key",
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      storage: platformStorage,
      storageKey: "pakkapresent-platform-auth",
    },
  },
);
export interface PlatformIdentity {
  user_id: string;
  email: string;
  full_name: string;
  role: "super_admin";
}
export async function getPlatformIdentity() {
  const { data, error } = await platformSupabase.rpc(
    "current_platform_identity",
  );
  if (error) throw error;
  return (data?.[0] as PlatformIdentity | undefined) ?? null;
}
export async function signInPlatform(email: string, password: string) {
  const { error } = await platformSupabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  const identity = await getPlatformIdentity();
  if (!identity) {
    await platformSupabase.auth.signOut();
    throw new Error(
      "This account is not authorized for Platform Administration.",
    );
  }
  return identity;
}
export async function signOutPlatform() {
  await platformSupabase.auth.signOut();
}
