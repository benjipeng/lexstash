'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [supabase] = useState(() => createClient());

    const isSigningOut = useRef(false);

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!isSigningOut.current) {
                setSession(session);
                setUser(session?.user ?? null);
            }
            setLoading(false);

            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (isSigningOut.current) return;
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        };

        initAuth();
    }, []);

    // ... signInWithGoogle ...

    const signOut = async () => {
        console.log('Signing out...');
        isSigningOut.current = true; // Block updates

        // 1. Optimistic Update: Clear local state immediately
        setUser(null);
        setSession(null);

        // 2. Call Supabase in the background
        try {
            await supabase.auth.signOut();
            console.log('Supabase session cleared.');
        } catch (error) {
            console.error('Error clearing Supabase session:', error);
        }

        // 3. Redirect immediately
        const isProd = process.env.NODE_ENV === 'production';
        const basePath = isProd ? '/lexstash' : '';
        window.location.href = `${basePath}/`;
    };

    const signInWithGoogle = async () => {
        // Construct the URL based on the current location to handle basePath automatically
        // If we are at /lexstash/login, 'auth/callback' -> /lexstash/auth/callback
        // If we use '/auth/callback', it goes to /auth/callback (stripping /lexstash)
        // We use 'auth/callback' (relative) to respect the current path structure.
        // Note: We assume we are at a route like /login or / (root).
        // To be safe, we can use window.location.origin + window.location.pathname (stripping the last segment if needed)
        // But simpler: if we are at /lexstash/login, we want /lexstash/auth/callback.
        // Let's use the origin + basePath logic if possible, or just rely on relative resolution from root?
        // Actually, safer to just grab the origin and append the known basePath if in prod.

        const isProd = process.env.NODE_ENV === 'production';
        const basePath = isProd ? '/lexstash' : '';
        const redirectUrl = `${window.location.origin}${basePath}/auth/callback`;

        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            },
        });
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
