/**
 * Feature flags derived from build-time environment variables.
 * In static export builds, these are evaluated at build time.
 */

const enableCloudRaw = process.env.NEXT_PUBLIC_ENABLE_CLOUD;
const enableCloud =
    enableCloudRaw === undefined || enableCloudRaw === null || enableCloudRaw.trim() === ''
        ? undefined
        : enableCloudRaw.trim().toLowerCase();

const hasSupabaseKeys = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * Cloud sync/auth is enabled when:
 * - NEXT_PUBLIC_ENABLE_CLOUD is explicitly "true" AND Supabase keys are present; or
 * - The flag is unset/empty and Supabase keys are present.
 *
 * Explicit "false" always disables cloud, even if keys exist.
 */
export const cloudEnabled =
    enableCloud === 'false' || enableCloud === '0'
        ? false
        : enableCloud === 'true' || enableCloud === '1'
            ? hasSupabaseKeys
            : hasSupabaseKeys;

export const cloudConfigured = hasSupabaseKeys;

