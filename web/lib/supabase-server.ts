import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    maxAge?: number;
    expires?: Date;
  };
};

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
      }
    }
  );
}
