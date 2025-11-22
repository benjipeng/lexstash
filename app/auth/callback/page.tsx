'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleAuthCallback = async () => {
            const code = searchParams.get('code');
            const next = searchParams.get('next') ?? '/';
            const errorParam = searchParams.get('error');
            const errorDesc = searchParams.get('error_description');

            // Debug info
            console.log('Full URL:', window.location.href);
            console.log('Search Params:', searchParams.toString());
            console.log('Hash:', window.location.hash);

            if (code) {
                setStatus('Exchanging code for session...');
                const supabase = createClient();
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    console.error('Error exchanging code for session:', error);
                    setError(error.message);
                    setStatus('Error!');
                } else {
                    setStatus(`Success! Logged in as ${data.session.user.email}. Redirecting...`);
                    setTimeout(() => {
                        router.push(next);
                    }, 2000);
                }
            } else if (errorParam) {
                setStatus(`Provider Error: ${errorDesc || errorParam}`);
                setError(errorDesc || errorParam);
            } else if (window.location.hash) {
                setStatus('Hash fragment detected (Implicit Flow?). This app expects PKCE (Query Params).');
                // Try to handle implicit flow if needed, or just warn
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                if (hashParams.get('access_token')) {
                    setStatus('Implicit flow detected. Attempting to set session...');
                    const supabase = createClient();
                    const { data, error } = await supabase.auth.getSession();
                    if (data.session) {
                        setStatus('Session found! Redirecting...');
                        router.push(next);
                    } else {
                        setError('Could not retrieve session from hash.');
                    }
                }
            } else {
                setStatus(`No code found. URL: ${window.location.href}`);
                // Don't redirect immediately so user can read the debug info
            }
        };

        handleAuthCallback();
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive font-bold">Authentication Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                    onClick={() => router.push('/login')}
                    className="text-sm underline"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-lg font-medium">{status}</p>
                <p className="text-xs text-muted-foreground">Please wait while we complete the sign-in process.</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
