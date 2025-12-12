'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { Prompt } from '@/types/prompt';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, Search, Plus, Settings, LogIn, LogOut, Cloud, CloudOff, HardDrive, Trash2 } from 'lucide-react';
import { supabaseStorage } from '@/lib/storage/supabase';
import { ModeToggle } from '@/components/mode-toggle';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DataManagementModal } from '@/components/DataManagementModal';
import { useAuth } from '@/components/auth-provider';
import { cloudEnabled } from '@/lib/features';
import { CloudDisabledModal } from '@/components/CloudDisabledModal';


import { useRouter } from 'next/navigation';

interface SidebarProps {
    onSelectPrompt: (prompt: Prompt, library: 'local' | 'cloud') => void;
    onCreateNew: () => void;
    onShowWelcome?: () => void;
    className?: string;
    activeLibrary?: 'local' | 'cloud';
    onLibraryChange?: (library: 'local' | 'cloud') => void;
    cloudRefreshKey?: number;
}

export function Sidebar({ onSelectPrompt, onCreateNew, onShowWelcome, className, activeLibrary, onLibraryChange, cloudRefreshKey }: SidebarProps) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [colorTheme, setColorTheme] = useState(() => {
        if (typeof window === 'undefined') return 'blue';
        return localStorage.getItem('color-theme') || 'blue';
    });
    const [showDataModal, setShowDataModal] = useState(false);
    const [cloudPrompts, setCloudPrompts] = useState<Prompt[]>([]);
    const [showCloudDisabledModal, setShowCloudDisabledModal] = useState(false);
    const { user, signOut } = useAuth();


    // Live query to automatically update when DB changes
    const prompts = useLiveQuery(
        () => db.prompts
            .orderBy('updatedAt')
            .reverse()
            .filter(p =>
                p.title.toLowerCase().includes(search.toLowerCase()) ||
                (p.tags && p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
            )
            .toArray(),
        [search]
    );

    // Apply theme changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', colorTheme);
        localStorage.setItem('color-theme', colorTheme);
    }, [colorTheme]);

    // Load cloud prompts when user is authenticated
    useEffect(() => {
        if (!cloudEnabled || !user) return;

        const loadCloudPrompts = async () => {
            const prompts = await supabaseStorage.getPrompts();
            setCloudPrompts(prompts);
        };

        loadCloudPrompts();
    }, [user, cloudRefreshKey]);

    // Helper to handle selection
    const handleSelect = (prompt: Prompt, library: 'local' | 'cloud') => {
        if (onLibraryChange) onLibraryChange(library);
        onSelectPrompt(prompt, library);
    };

    // Helper to handle cloud prompt deletion
    const handleDeleteCloud = async (promptId: string, promptTitle: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the prompt

        const confirmed = window.confirm(`Delete "${promptTitle}" from cloud?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        try {
            await supabaseStorage.deletePrompt(promptId);
            setCloudPrompts(cloudPrompts.filter(p => p.id !== promptId));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete prompt. Please try again.');
        }
    };

    // Helper to handle local prompt deletion
    const handleDeleteLocal = async (promptId: string, promptTitle: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the prompt

        const confirmed = window.confirm(`Delete "${promptTitle}" from local storage?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        try {
            await db.prompts.delete(promptId);
            // Dexie live query will automatically update the list
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete prompt. Please try again.');
        }
    };

    const themes = [
        { name: 'blue', color: 'bg-blue-500' },
        { name: 'purple', color: 'bg-purple-500' },
        { name: 'green', color: 'bg-green-500' },
        { name: 'orange', color: 'bg-orange-500' },
    ];

    return (
        <div className={cn("w-64 border-r bg-muted/10 flex flex-col h-screen sticky top-0", className)}>
            {/* ... (Header remains same) ... */}
            <div className="p-4 border-b flex items-center justify-between bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onShowWelcome}>
                    <Logo size={28} />
                    <h1 className="font-bold text-xl tracking-tight">Lexstash</h1>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={onCreateNew} title="New Prompt">
                        <Plus size={18} />
                    </Button>
                    <ModeToggle />
                </div>
            </div>
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        className="w-full pl-8 pr-2 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {/* Cloud Library Section */}
                {cloudEnabled && user && (
                    <div className="space-y-1">
                        <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Cloud size={12} className={activeLibrary === 'cloud' ? "text-primary" : ""} />
                                <span className={activeLibrary === 'cloud' ? "text-primary" : ""}>Cloud Library</span>
                            </div>
                            <span className="text-muted-foreground">{cloudPrompts.length}/30</span>
                        </div>
                        {cloudPrompts.map((prompt) => (
                            <div key={prompt.id} className="relative group">
                                <button
                                    onClick={() => handleSelect(prompt, 'cloud')}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors",
                                        activeLibrary === 'cloud' ? "bg-primary/10 dark:bg-primary/20" : ""
                                    )}
                                >
                                    <FileText size={16} className="text-primary group-hover:text-primary/80 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{prompt.title}</div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                                            {prompt.tags && prompt.tags.length > 0 && (
                                                <div className="flex gap-1 overflow-hidden">
                                                    {prompt.tags.slice(0, 2).map(tag => (
                                                        <span key={tag} className="px-1.5 py-0.5 bg-muted rounded-full text-[10px] truncate max-w-[60px]">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => handleDeleteCloud(prompt.id, prompt.title, e)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                    title="Delete prompt"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {cloudPrompts.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                No cloud prompts yet.
                            </div>
                        )}
                    </div>
                )}

                {/* Local Storage Section */}
                <div className="space-y-1">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <HardDrive size={12} className={activeLibrary === 'local' ? "text-primary" : ""} />
                        <span className={activeLibrary === 'local' ? "text-primary" : ""}>Local Storage</span>
                    </div>
                    {prompts?.map((prompt) => (
                        <div key={prompt.id} className="relative group">
                            <button
                                onClick={() => handleSelect(prompt, 'local')}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors",
                                    activeLibrary === 'local' ? "bg-accent" : ""
                                )}
                            >
                                <FileText size={16} className="text-muted-foreground group-hover:text-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{prompt.title}</div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{new Date(prompt.updatedAt).toLocaleDateString()}</span>
                                        {prompt.tags && prompt.tags.length > 0 && (
                                            <div className="flex gap-1 overflow-hidden">
                                                {prompt.tags.slice(0, 2).map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-muted rounded-full text-[10px] truncate max-w-[60px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                                {prompt.tags.length > 2 && (
                                                    <span className="text-[10px] self-center">+{prompt.tags.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={(e) => handleDeleteLocal(prompt.id, prompt.title, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                title="Delete prompt"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}

                    {prompts?.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground italic">
                            No local prompts found.
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Palette</span>
                    <div className="flex gap-2">
                        {themes.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setColorTheme(t.name)}
                                className={`w-4 h-4 rounded-full ${t.color} ring-offset-2 ring-offset-background transition-all ${colorTheme === t.name ? 'ring-2 ring-foreground scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'
                                    }`}
                                title={t.name.charAt(0).toUpperCase() + t.name.slice(1)}
                            />
                        ))}
                    </div>
                </div>

                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowDataModal(true)}>
                    <Settings size={14} />
                    Manage Data
                </Button>

                <div className="pt-2 border-t">
                    {!cloudEnabled ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                                onClick={() => setShowCloudDisabledModal(true)}
                                title="This build runs local‑only"
                            >
                                <CloudOff size={14} />
                                Local Mode
                            </Button>
                            <CloudDisabledModal
                                isOpen={showCloudDisabledModal}
                                onClose={() => setShowCloudDisabledModal(false)}
                            />
                        </>
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                                {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.email}</p>
                                <button
                                    onClick={() => signOut()}
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                    <LogOut size={10} /> Sign out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Button variant="default" size="sm" className="w-full gap-2" onClick={() => router.push('/login')}>
                            <LogIn size={14} />
                            Sign In / Sync
                        </Button>
                    )}
                </div>
            </div>

            <DataManagementModal
                isOpen={showDataModal}
                onClose={() => setShowDataModal(false)}
            />
        </div>
    );
}
