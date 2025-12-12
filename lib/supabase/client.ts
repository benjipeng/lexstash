import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloudEnabled } from '@/lib/features';

// Create a single shared Supabase client instance only when cloud is enabled.
// This prevents "Multiple GoTrueClient instances" warnings and avoids crashes
// in local-only builds without Supabase keys.
let supabaseClient: SupabaseClient | null = null;

if (cloudEnabled) {
    supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export const supabase = supabaseClient;

export function requireSupabase(): SupabaseClient {
    if (!supabaseClient) {
        throw new Error('Cloud sync is disabled in this build.');
    }
    return supabaseClient;
}
