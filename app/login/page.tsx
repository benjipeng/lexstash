'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cloudEnabled } from '@/lib/features';

export default function LoginPage() {
    const { signInWithGoogle, user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !loading) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!cloudEnabled) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="scale-150">
                                <Logo />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Local‑Only Mode</CardTitle>
                        <CardDescription>
                            Cloud sync is disabled in this build.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground space-y-2 mb-4">
                            <p>To enable cloud sync:</p>
                            <ol className="list-decimal pl-5 space-y-1">
                                <li>Set <code className="px-1">NEXT_PUBLIC_ENABLE_CLOUD=true</code>.</li>
                                <li>Add <code className="px-1">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.</li>
                                <li>Rebuild/redeploy (flags are baked into static exports).</li>
                            </ol>
                        </div>
                        <Button className="w-full" size="lg" onClick={() => router.push('/')}>
                            Back to app
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="scale-150">
                            <Logo />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                        Sign in to your account to sync your prompts across devices.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={signInWithGoogle}
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Sign in with Google
                    </Button>
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        <p>Don&apos;t have an account? It will be created automatically.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
