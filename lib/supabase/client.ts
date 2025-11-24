import { createClient } from '@supabase/supabase-js'

// Create a single shared Supabase client instance
// This prevents "Multiple GoTrueClient instances" warnings
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
